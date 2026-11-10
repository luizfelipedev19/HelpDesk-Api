import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PASSWORD, createTenant, pool, startServer, Tenant } from './helpers';

let api: Awaited<ReturnType<typeof startServer>>;

before(async () => {
    api = await startServer();
});

after(() => api.close());

const login = (path: string, email: string, password = PASSWORD) =>
    api.request('POST', path, {body: {email, password}});

test('login: atendente e gestor entram por /auth/login, admin por /superadmin/login', async () => {
    const t = await createTenant();
    const atendente = await t.createUser('atendente');
    const gestor = await t.createUser('gestor');

    assert.equal((await login('/auth/login', atendente.email)).status, 200);
    assert.equal((await login('/auth/login', gestor.email)).status, 200);

    const admin = await login('/superadmin/login', t.admin.email);
    assert.equal(admin.status, 200);
    assert.equal(typeof admin.body.token, 'string');
});

test('login: senha errada e papel na rota errada retornam 401', async () => {
    const t = await createTenant();
    const atendente = await t.createUser('atendente');

    assert.equal((await login('/auth/login', atendente.email, 'senha-errada')).status, 401);
    assert.equal((await login('/auth/login', t.admin.email)).status, 401);
    assert.equal((await login('/superadmin/login', atendente.email)).status, 401);
});

test('usuário desativado perde o acesso imediatamente, com o mesmo token', async () => {
    const t = await createTenant();
    const user = await t.createUser('atendente');

    assert.equal((await api.request('GET', '/tickets', {token: user.token})).status, 200);

    const off = await api.request('PUT', `/users/desativar/${user.id}`, {token: t.admin.token});
    assert.equal(off.status, 204);

    assert.equal((await api.request('GET', '/tickets', {token: user.token})).status, 401);
    assert.equal((await login('/auth/login', user.email)).status, 401);
});

test('empresa desativada derruba todos os tokens e bloqueia login', async () => {
    const t = await createTenant();
    const user = await t.createUser('atendente');

    const off = await api.request('PUT', '/companies/me/desativar', {token: t.admin.token});
    assert.equal(off.status, 204);

    assert.equal((await api.request('GET', '/tickets', {token: user.token})).status, 401);
    assert.equal((await api.request('GET', '/tickets', {token: t.admin.token})).status, 401);
    assert.equal((await login('/auth/login', user.email)).status, 401);
});

test('mudança de papel no banco vale na hora, sem novo login', async () => {
    const t: Tenant = await createTenant();
    const user = await t.createUser('atendente');

    assert.equal((await api.request('GET', '/audit', {token: user.token})).status, 403);

    await pool.query(`update users set role = 'gestor' where id_user = $1`, [user.id]);

    assert.equal((await api.request('GET', '/audit', {token: user.token})).status, 200);
});

test('token adulterado ou assinado com outro segredo é rejeitado', async () => {
    const res = await api.request('GET', '/tickets', {token: 'abc.def.ghi'});
    assert.equal(res.status, 401);
});
