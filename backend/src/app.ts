import express from 'express';
import { Request } from 'express';
import { createHash } from 'node:crypto';
import  rateLimit, {ipKeyGenerator} from 'express-rate-limit';
import { usersRouter } from './routes/user.routes';
import { errorMiddleware } from './middleware/error.middleware';
import { authRouter, superadminRouter } from './routes/auth.routes';
import { companiesRouter } from './routes/company.routes';
import { categoriesRouter } from './routes/categories.routes';
import { authenticate } from './middleware/auth.middleware';
import { ticketRouter } from './routes/ticket.routes';
import { auditRouter } from './routes/audit.routes';

export const app = express();
// Atrás de proxy/ingress (Docker, Kubernetes, nginx), o req.ip seria o do proxy
// e todo mundo dividiria o mesmo limite. Ajuste o número ao seu nº de proxies.
// Rodando direto, sem proxy, remova esta linha.
app.set('trust proxy', 1);

// Gera a chave de rate limit por CONTA (não por IP): hash do e-mail do body,
// nunca o e-mail em texto puro. Usada junto com o IP pra travar força bruta
// numa conta específica, mesmo que o atacante troque de IP.
function emailKey(req: Request): string {
    const raw = typeof req.body?.email === 'string' ? req.body.email : '';
    const email = raw.trim().toLowerCase().slice(0, 150);
    return createHash('sha256').update(email).digest('hex').slice(0, 150);
}

// Opções repetidas em todo rate limiter, pra não duplicar em cada um.
const common = {
    standardHeaders: 'draft-7' as const, //envia RateLimit-* nos headers
    legacyHeaders: false,
}

// Trava por IP + conta: no máximo 5 tentativas de login na MESMA conta a cada 15min.
// skipSuccessfulRequests: só conta tentativa falha, login certo não gasta a cota.
const loginAccountLimiter  = rateLimit({
    ...common,
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => `${ipKeyGenerator(req.ip!)}|${emailKey(req)}`,
    message: 'Muitas tentativas, aguarde 15 minutos.',
});

// Trava só por IP: no máximo 30 tentativas de login (em QUALQUER conta) a cada 15min.
// Pega o caso de um IP varrendo várias contas, que o limiter de cima não cobre sozinho.
const loginIpLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 30,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => ipKeyGenerator(req.ip!),
  message: { message: 'Muitas tentativas, aguarde 15 minutos.' },
});

// Trava criação de empresa por IP: no máximo 5 cadastros por hora. Evita spam de signup.
const companyLimiter = rateLimit({
    ...common,
    windowMs: 60 * 60 * 1000,
    limit: 5,
    message: 'Muitos cadastros deste IP, tente mais tarde.',
});

// Limite geral de uso da API, por EMPRESA (não por usuário individual) — todo
// mundo da mesma empresa divide a mesma cota. Admin tem cota maior.
// Só funciona porque esse limiter sempre roda DEPOIS do middleware `authenticate`
// nas rotas abaixo — sem isso, req.user seria undefined e o `!` quebraria.
const apiLimiter = rateLimit({
    ...common,
    windowMs: 60 * 1000,
    limit: (req) => (req.user?.role === 'admin' ? 100 : 60),
    keyGenerator: (req) => `user${req.user!.companyId}`,
    message: 'Limite de requisições execido.',
});

// Faz o parse do body como JSON antes de qualquer rota — sem isso, req.body
// chegaria undefined em todos os controllers.
app.use(express.json());



// Endpoint de liveness check, sem autenticação — usado por orquestradores
// (Docker/Kubernetes) ou monitoramento pra saber se o processo está de pé.
app.get('/health', (_req, res) => {
    res.json({status: 'ok'});
});

// Rotas públicas (sem `authenticate`) — login e cadastro de empresa precisam
// funcionar sem token ainda.
app.use('/auth', loginIpLimiter, loginAccountLimiter, authRouter);
app.use('/superadmin', loginIpLimiter, loginAccountLimiter, superadminRouter);
app.use('/companies', companyLimiter, companiesRouter);

// Rotas autenticadas: `authenticate` roda primeiro e popula req.user,
// só depois o `apiLimiter` (que depende de req.user) e então o router de fato.
app.use('/users', authenticate, apiLimiter, usersRouter);
app.use('/categories', authenticate, apiLimiter, categoriesRouter);
app.use('/tickets', authenticate, apiLimiter, ticketRouter);
app.use('/audit', authenticate, apiLimiter, auditRouter);


// Middleware de erro: só funciona registrado por ÚLTIMO, depois de todas as
// rotas. Captura qualquer throw (ex: AppError) e vira uma resposta HTTP padronizada.
app.use(errorMiddleware);
