"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const node_crypto_1 = require("node:crypto");
const express_rate_limit_1 = __importStar(require("express-rate-limit"));
const user_routes_1 = require("./routes/user.routes");
const error_middleware_1 = require("./middleware/error.middleware");
const auth_routes_1 = require("./routes/auth.routes");
const company_routes_1 = require("./routes/company.routes");
const categories_routes_1 = require("./routes/categories.routes");
const auth_middleware_1 = require("./middleware/auth.middleware");
const ticket_routes_1 = require("./routes/ticket.routes");
exports.app = (0, express_1.default)();
// Atrás de proxy/ingress (Docker, Kubernetes, nginx), o req.ip seria o do proxy
// e todo mundo dividiria o mesmo limite. Ajuste o número ao seu nº de proxies.
// Rodando direto, sem proxy, remova esta linha.
exports.app.set('trust proxy', 1);
function emailKey(req) {
    const raw = typeof req.body?.email === 'string' ? req.body.email : '';
    const email = raw.trim().toLowerCase().slice(0, 150);
    return (0, node_crypto_1.createHash)('sha256').update(email).digest('hex').slice(0, 150);
}
const common = {
    standardHeaders: 'draft-7', //envia RateLimit-* nos headers
    legacyHeaders: false,
};
const loginAccountLimiter = (0, express_rate_limit_1.default)({
    ...common,
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => `${(0, express_rate_limit_1.ipKeyGenerator)(req.ip)}|${emailKey(req)}`,
    message: 'Muitas tentativas, aguarde 15 minutos.',
});
const loginIpLimiter = (0, express_rate_limit_1.default)({
    ...common,
    windowMs: 15 * 60 * 1000,
    limit: 30,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => (0, express_rate_limit_1.ipKeyGenerator)(req.ip),
    message: { message: 'Muitas tentativas, aguarde 15 minutos.' },
});
const companyLimiter = (0, express_rate_limit_1.default)({
    ...common,
    windowMs: 60 * 60 * 1000,
    limit: 5,
    message: 'Muitos cadastros deste IP, tente mais tarde.',
});
const apiLimiter = (0, express_rate_limit_1.default)({
    ...common,
    windowMs: 60 * 1000,
    limit: (req) => (req.user?.role === 'admin' ? 100 : 60),
    keyGenerator: (req) => `user${req.user.companyId}`,
    message: 'Limite de requisições execido.',
});
exports.app.use(express_1.default.json());
exports.app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
exports.app.use('/auth', loginIpLimiter, loginAccountLimiter, auth_routes_1.authRouter);
exports.app.use('/superadmin', loginIpLimiter, loginAccountLimiter, auth_routes_1.superadminRouter);
exports.app.use('/companies', companyLimiter, company_routes_1.companiesRouter);
exports.app.use('/users', auth_middleware_1.authenticate, apiLimiter, user_routes_1.usersRouter);
exports.app.use('/categories', auth_middleware_1.authenticate, apiLimiter, categories_routes_1.categoriesRouter);
exports.app.use('/tickets', auth_middleware_1.authenticate, apiLimiter, ticket_routes_1.ticketRouter);
exports.app.use(error_middleware_1.errorMiddleware);
