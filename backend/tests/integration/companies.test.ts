import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTenant, makeCnpj, startServer } from './helpers';

let api: Awaited<ReturnType<typeof startServer>>;

before(async () => {
    api = await startServer();
});

after(() => api.close());

// POST /companies tem rate limit de 5/hora por IP: este arquivo faz exatamente 5 chamadas (o limite)
const unique = () => `${process.pid}${Date.now()}`;

test('cadastro cria empresa e admin; CNPJ ou e-mail repetidos retornam 409', async () => {
    const body = {
        companyName: 'Acme',
        cnpj: makeCnpj(),
        responsibleName: 'Fulano',
        email: `fulano-${unique()}@teste.com`,
        password: 'Senha@12345',
    };

    const created = await api.request('POST', '/companies', {body});
    assert.equal(created.status, 201);
    assert.equal(created.body.admin.role, 'admin');
    assert.equal('passwordHash' in created.body.admin, false);

    const dupCnpj = await api.request('POST', '/companies', {body: {...body, email: `outro-${unique()}@teste.com`}});
    const dupEmail = await api.request('POST', '/companies', {body: {...body, cnpj: makeCnpj()}});

    assert.equal(dupCnpj.status, 409);
    assert.equal(dupEmail.status, 409);
});

test('cadastro rejeita CNPJ inválido e corpo com campos extras', async () => {
    const base = {companyName: 'X Ltda', responsibleName: 'Fulano', email: `x-${unique()}@teste.com`, password: 'Senha@12345'};

    const badCnpj = await api.request('POST', '/companies', {body: {...base, cnpj: '11.111.111/1111-11'}});
    const extra = await api.request('POST', '/companies', {body: {...base, cnpj: '11.222.333/0001-81', role: 'admin'}});

    assert.equal(badCnpj.status, 400);
    assert.equal(extra.status, 400);
});

test('GET /companies/me devolve só a empresa do token e não existe mais consulta pública por id', async () => {
    const t = await createTenant();

    const me = await api.request('GET', '/companies/me', {token: t.admin.token});
    assert.equal(me.status, 200);
    assert.equal(me.body.id, t.companyId);

    const publicLookup = await api.request('GET', `/companies/${t.companyId}`);
    assert.equal(publicLookup.status, 404);
    assert.equal((await api.request('GET', '/companies/me')).status, 401);
});

test('só admin edita a empresa', async () => {
    const t = await createTenant();
    const atendente = await t.createUser('atendente');
    const gestor = await t.createUser('gestor');

    const byAtendente = await api.request('PUT', '/companies/me', {token: atendente.token, body: {companyName: 'Nova'}});
    const byGestor = await api.request('PUT', '/companies/me', {token: gestor.token, body: {companyName: 'Nova'}});
    const byAdmin = await api.request('PUT', '/companies/me', {token: t.admin.token, body: {companyName: 'Nome Atualizado'}});

    assert.deepEqual([byAtendente.status, byGestor.status, byAdmin.status], [403, 403, 200]);
    assert.equal(byAdmin.body.name, 'Nome Atualizado');
});
