import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PASSWORD, createTenant, startServer } from './helpers';

let api: Awaited<ReturnType<typeof startServer>>;

before(async () => {
    api = await startServer();
});

after(() => api.close());

test('GET /health responde 200 sem autenticação', async () => {
    const res = await api.request('GET', '/health');

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'ok' });
});

test('rotas protegidas exigem token', async () => {
    const protectedRoutes: [string, string][] = [
        ['GET', '/tickets'], ['POST', '/tickets'], ['GET', '/users'], ['GET', '/categories'],
        ['GET', '/audit'], ['GET', '/companies/me'], ['PUT', '/companies/me'],
    ];

    for (const [method, path] of protectedRoutes) {
        const res = await api.request(method, path);
        assert.equal(res.status, 401, `${method} ${path}`);
    }
});

test('JSON malformado no body retorna 400, não 500', async () => {
    const t = await createTenant();

    const res = await api.raw('POST', '/categories', '{ "name": "quebrado", ', t.admin.token);

    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { message: 'JSON inválido' });
});

test('erros de validação seguem o formato { message, errors: [{ field, message }] }', async () => {
    const t = await createTenant();

    const res = await api.request('POST', '/categories', { token: t.admin.token, body: { name: 'a', color: 'x' } });

    assert.equal(res.status, 400);
    assert.equal(res.body.message, 'Dados inválidos');
    for (const error of res.body.errors) {
        assert.equal(typeof error.field, 'string');
        assert.equal(typeof error.message, 'string');
    }
});

test('login: a 6ª tentativa errada na mesma conta é bloqueada com 429', async () => {
    const t = await createTenant();
    const user = await t.createUser('atendente');
    const attempt = () => api.request('POST', '/auth/login', { body: { email: user.email, password: 'errada' } });

    for (let i = 0; i < 5; i++) {
        assert.equal((await attempt()).status, 401, `tentativa ${i + 1}`);
    }

    assert.equal((await attempt()).status, 429);
    // a conta bloqueada nem com a senha certa entra enquanto durar o bloqueio
    const right = await api.request('POST', '/auth/login', { body: { email: user.email, password: PASSWORD } });
    assert.equal(right.status, 429);
});

test('login: o limite é por conta, outra conta no mesmo IP continua podendo entrar', async () => {
    const t = await createTenant();
    const blocked = await t.createUser('atendente');
    const free = await t.createUser('atendente');

    for (let i = 0; i < 6; i++) {
        await api.request('POST', '/auth/login', { body: { email: blocked.email, password: 'errada' } });
    }

    const res = await api.request('POST', '/auth/login', { body: { email: free.email, password: PASSWORD } });
    assert.equal(res.status, 200);
});

test('login: tentativas bem-sucedidas não consomem a cota', async () => {
    const t = await createTenant();
    const user = await t.createUser('atendente');

    for (let i = 0; i < 8; i++) {
        const res = await api.request('POST', '/auth/login', { body: { email: user.email, password: PASSWORD } });
        assert.equal(res.status, 200, `login ${i + 1}`);
    }
});

test('limite geral da API: atendente tem 60 req/min por empresa; a 61ª retorna 429', async () => {
    const t = await createTenant();
    const user = await t.createUser('atendente');

    for (let i = 0; i < 60; i++) {
        const res = await api.request('GET', '/categories', { token: user.token });
        assert.equal(res.status, 200, `requisição ${i + 1}`);
    }

    assert.equal((await api.request('GET', '/categories', { token: user.token })).status, 429);
});

test('limite geral da API é por empresa: outra empresa não é afetada', async () => {
    const busy = await createTenant();
    const calm = await createTenant();
    const busyUser = await busy.createUser('atendente');

    for (let i = 0; i < 61; i++) {
        await api.request('GET', '/categories', { token: busyUser.token });
    }

    assert.equal((await api.request('GET', '/categories', { token: calm.admin.token })).status, 200);
});
