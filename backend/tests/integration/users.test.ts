import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTenant, pool, startServer, Tenant } from './helpers';

let api: Awaited<ReturnType<typeof startServer>>;
let t: Tenant;

before(async () => {
    api = await startServer();
    t = await createTenant();
});

after(() => api.close());

let seq = 0;
const newUserBody = (overrides: Record<string, unknown> = {}) => ({
    name: 'Novo Usuário',
    email: `novo-${process.pid}-${Date.now()}-${seq++}@teste.com`,
    password: 'Senha@12345',
    role: 'atendente',
    ...overrides,
});

test('admin cria usuário: 201, sem passwordHash, na empresa do token, com senha em hash argon2', async () => {
    const body = newUserBody({ email: `MiXeD-${Date.now()}@Teste.com` });
    const res = await api.request('POST', '/users', { token: t.admin.token, body });

    assert.equal(res.status, 201);
    assert.equal(res.body.companyId, t.companyId);
    assert.equal(res.body.email, body.email.toLowerCase());
    assert.equal(res.body.active, true);
    assert.equal('passwordHash' in res.body, false);

    const {rows} = await pool.query(`select password_hash from users where id_user = $1`, [res.body.id]);
    assert.match(rows[0].password_hash, /^\$argon2/);
    assert.notEqual(rows[0].password_hash, body.password);
});

test('o novo usuário consegue logar com a senha cadastrada', async () => {
    const body = newUserBody();
    await api.request('POST', '/users', { token: t.admin.token, body });

    const login = await api.request('POST', '/auth/login', { body: { email: body.email, password: body.password } });

    assert.equal(login.status, 200);
    assert.equal(typeof login.body.token, 'string');
});

test('criação rejeita e-mail repetido (409), admin como papel, senha curta e campos extras (400)', async () => {
    const body = newUserBody();
    await api.request('POST', '/users', { token: t.admin.token, body });

    const dup = await api.request('POST', '/users', { token: t.admin.token, body });
    const asAdmin = await api.request('POST', '/users', { token: t.admin.token, body: newUserBody({ role: 'admin' }) });
    const short = await api.request('POST', '/users', { token: t.admin.token, body: newUserBody({ password: '123' }) });
    const extra = await api.request('POST', '/users', { token: t.admin.token, body: newUserBody({ companyId: 'outra' }) });

    assert.deepEqual([dup.status, asAdmin.status, short.status, extra.status], [409, 400, 400, 400]);
});

test('e-mail repetido é global: mesmo e-mail em outra empresa também é 409', async () => {
    const other = await createTenant();
    const body = newUserBody();
    await api.request('POST', '/users', { token: t.admin.token, body });

    const res = await api.request('POST', '/users', { token: other.admin.token, body });

    assert.equal(res.status, 409);
});

test('GET /users/:id devolve o usuário; 404 se não existe; 400 se o id é malformado', async () => {
    const user = await t.createUser('gestor');

    const found = await api.request('GET', `/users/${user.id}`, { token: t.admin.token });
    const missing = await api.request('GET', '/users/00000000-0000-4000-8000-000000000000', { token: t.admin.token });
    const malformed = await api.request('GET', '/users/abc', { token: t.admin.token });

    assert.equal(found.status, 200);
    assert.equal(found.body.id, user.id);
    assert.equal(found.body.role, 'gestor');
    assert.equal('passwordHash' in found.body, false);
    assert.equal(missing.status, 404);
    assert.equal(malformed.status, 400);
});

test('GET /users lista só ativos da empresa, sem passwordHash, e pagina', async () => {
    const tenant = await createTenant();
    const a = await tenant.createUser('atendente');
    const b = await tenant.createUser('atendente');
    await api.request('PUT', `/users/desativar/${b.id}`, { token: tenant.admin.token });

    const list = await api.request('GET', '/users', { token: tenant.admin.token });
    const ids = list.body.map((u: { id: string }) => u.id);

    assert.equal(list.status, 200);
    assert.ok(ids.includes(a.id));
    assert.ok(ids.includes(tenant.admin.id));
    assert.equal(ids.includes(b.id), false);
    assert.ok(list.body.every((u: { companyId: string }) => u.companyId === tenant.companyId));
    assert.ok(list.body.every((u: object) => !('passwordHash' in u)));

    const page = await api.request('GET', '/users?limit=1', { token: tenant.admin.token });
    assert.equal(page.body.length, 1);

    const invalid = await api.request('GET', '/users?limit=1000', { token: tenant.admin.token });
    assert.equal(invalid.status, 400);
});

test('desativar: 204, o usuário some do GET e da listagem; repetir dá 404', async () => {
    const user = await t.createUser('atendente');

    const off = await api.request('PUT', `/users/desativar/${user.id}`, { token: t.admin.token });
    const get = await api.request('GET', `/users/${user.id}`, { token: t.admin.token });
    const again = await api.request('PUT', `/users/desativar/${user.id}`, { token: t.admin.token });

    assert.deepEqual([off.status, get.status, again.status], [204, 404, 404]);

    const {rows} = await pool.query(`select active, updated_at from users where id_user = $1`, [user.id]);
    assert.equal(rows[0].active, false);
    assert.notEqual(rows[0].updated_at, null);
});

test('desativar usuário de outra empresa é 404 e não altera nada', async () => {
    const other = await createTenant();
    const victim = await other.createUser('atendente');

    const res = await api.request('PUT', `/users/desativar/${victim.id}`, { token: t.admin.token });
    const {rows} = await pool.query(`select active from users where id_user = $1`, [victim.id]);

    assert.equal(res.status, 404);
    assert.equal(rows[0].active, true);
});
