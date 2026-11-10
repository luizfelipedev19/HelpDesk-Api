import { test, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { authenticate, authorize } from '../../src/middleware/auth.middleware';
import { errorMiddleware } from '../../src/middleware/error.middleware';
import { AppError } from '../../src/errors/app-errors';
import { userRepository } from '../../src/repository/user.repository';
import { loginSchema } from '../../src/schema/auth.schema';

const SECRET = 'segredo-de-teste';
const USER_ID = '3f2b8c1e-5d4a-4b6e-8a9c-1d2e3f4a5b6c';
const COMPANY_ID = '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d';

beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
});

afterEach(() => {
    mock.restoreAll();
});

const isAppError = (status: number) => (err: unknown) => err instanceof AppError && err.statusCode === status;

function fakeRes() {
    const res = {
        statusCode: 0,
        body: undefined as unknown,
        status(code: number) { this.statusCode = code; return this; },
        json(payload: unknown) { this.body = payload; return this; },
    };
    return res;
}

const signToken = (payload: object = {}, secret = SECRET) =>
    jwt.sign({ sub: USER_ID, role: 'atendente', companyId: COMPANY_ID, ...payload }, secret, { algorithm: 'HS256', expiresIn: '1h' });

// --- AppError ---

test('AppError usa status 400 por padrão e guarda a mensagem', () => {
    const err = new AppError('falhou');

    assert.equal(err.statusCode, 400);
    assert.equal(err.message, 'falhou');
    assert.ok(err instanceof Error);
});

// --- authorize ---

test('authorize: sem usuário autenticado lança 401', () => {
    assert.throws(() => authorize('admin')({} as Request, {} as Response, () => {}), isAppError(401));
});

test('authorize: papel fora da lista lança 403', () => {
    const req = { user: { id: USER_ID, role: 'atendente', companyId: COMPANY_ID } } as Request;

    assert.throws(() => authorize('admin', 'gestor')(req, {} as Response, () => {}), isAppError(403));
});

test('authorize: papel permitido chama next()', () => {
    const req = { user: { id: USER_ID, role: 'gestor', companyId: COMPANY_ID } } as Request;
    const next = mock.fn();

    authorize('admin', 'gestor')(req, {} as Response, next);

    assert.equal(next.mock.callCount(), 1);
});

// --- authenticate ---

async function runAuthenticate(header?: string) {
    const req = { headers: header ? { authorization: header } : {} } as Request;
    const next = mock.fn();
    await authenticate(req, {} as Response, next);
    return { req, next };
}

test('authenticate: sem header Authorization retorna 401', async () => {
    await assert.rejects(runAuthenticate(), isAppError(401));
});

test('authenticate: header sem "Bearer " retorna 401', async () => {
    await assert.rejects(runAuthenticate(signToken()), isAppError(401));
});

test('authenticate: token malformado, assinado com outro segredo ou expirado retorna 401', async () => {
    await assert.rejects(runAuthenticate('Bearer abc.def.ghi'), isAppError(401));
    await assert.rejects(runAuthenticate(`Bearer ${signToken({}, 'outro-segredo')}`), isAppError(401));

    const expired = jwt.sign({ sub: USER_ID, role: 'atendente', companyId: COMPANY_ID }, SECRET, { algorithm: 'HS256', expiresIn: -10 });
    await assert.rejects(runAuthenticate(`Bearer ${expired}`), isAppError(401));
});

test('authenticate: token com payload inesperado (sem companyId) retorna 401', async () => {
    const bad = jwt.sign({ sub: USER_ID, role: 'atendente' }, SECRET, { algorithm: 'HS256' });

    await assert.rejects(runAuthenticate(`Bearer ${bad}`), isAppError(401));
});

test('authenticate: token HS384 é rejeitado (só HS256 é aceito)', async () => {
    const other = jwt.sign({ sub: USER_ID, role: 'admin', companyId: COMPANY_ID }, SECRET, { algorithm: 'HS384' });

    await assert.rejects(runAuthenticate(`Bearer ${other}`), isAppError(401));
});

test('authenticate: usuário inexistente ou inativo (ou empresa inativa) retorna 401', async () => {
    mock.method(userRepository, 'findAuthState', async () => null);
    await assert.rejects(runAuthenticate(`Bearer ${signToken()}`), isAppError(401));

    mock.method(userRepository, 'findAuthState', async () => ({ role: 'atendente', active: false }));
    await assert.rejects(runAuthenticate(`Bearer ${signToken()}`), isAppError(401));
});

test('authenticate: popula req.user usando o papel do BANCO, não o do token', async () => {
    mock.method(userRepository, 'findAuthState', async () => ({ role: 'gestor', active: true }));

    const { req, next } = await runAuthenticate(`Bearer ${signToken({ role: 'atendente' })}`);

    assert.deepEqual(req.user, { id: USER_ID, role: 'gestor', companyId: COMPANY_ID });
    assert.equal(next.mock.callCount(), 1);
});

test('authenticate: lança erro de configuração se JWT_SECRET não existir', async () => {
    delete process.env.JWT_SECRET;

    await assert.rejects(runAuthenticate('Bearer x'), /JWT_SECRET/);
});

// --- errorMiddleware ---

test('errorMiddleware: ZodError vira 400 com o detalhe por campo', () => {
    const error = loginSchema.safeParse({ email: 'x', password: '' }).error!;
    const res = fakeRes();

    errorMiddleware(error, {} as Request, res as unknown as Response, () => {});

    assert.equal(res.statusCode, 400);
    const body = res.body as { message: string; errors: { field: string }[] };
    assert.equal(body.message, 'Dados inválidos');
    assert.deepEqual(body.errors.map((e) => e.field).sort(), ['email', 'password']);
});

test('errorMiddleware: AppError usa o próprio status e mensagem', () => {
    const res = fakeRes();

    errorMiddleware(new AppError('Ticket nao encontrado', 404), {} as Request, res as unknown as Response, () => {});

    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, { message: 'Ticket nao encontrado' });
});

test('errorMiddleware: erro desconhecido vira 500 genérico, sem vazar a mensagem interna', () => {
    mock.method(console, 'error', () => {});
    const res = fakeRes();

    errorMiddleware(new Error('senha do banco: 123'), {} as Request, res as unknown as Response, () => {});

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { message: 'Erro interno' });
});

test('errorMiddleware: JSON malformado no body (entity.parse.failed) vira 400, não 500', () => {
    const res = fakeRes();
    const parseError = Object.assign(new SyntaxError('Unexpected token'), { type: 'entity.parse.failed' });

    errorMiddleware(parseError, {} as Request, res as unknown as Response, () => {});

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { message: 'JSON inválido' });
});
