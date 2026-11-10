import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTenant, startServer, ticketBody, Tenant, TestUser } from './helpers';

let api: Awaited<ReturnType<typeof startServer>>;
let t: Tenant;
let atendente: TestUser;
let outro: TestUser;
let gestor: TestUser;
let categoryId: string;

before(async () => {
    api = await startServer();
    t = await createTenant();
    atendente = await t.createUser('atendente');
    outro = await t.createUser('atendente');
    gestor = await t.createUser('gestor');
    categoryId = await t.createCategory();
});

after(() => api.close());

async function newTicket(assignedTo?: string): Promise<string> {
    const res = await api.request('POST', '/tickets', {
        token: t.admin.token,
        body: ticketBody(categoryId, assignedTo ? {assignedTo} : {}),
    });
    assert.equal(res.status, 201);
    return res.body.id;
}

test('sem token, a API responde 401', async () => {
    const res = await api.request('GET', '/tickets');
    assert.equal(res.status, 401);
});

test('atendente não altera ticket de outro atendente', async () => {
    const id = await newTicket(outro.id);
    const res = await api.request('PUT', `/tickets/${id}`, {token: atendente.token, body: {status: 'EM_ATENDIMENTO'}});
    assert.equal(res.status, 403);
});

test('atendente altera ticket da fila e ticket próprio', async () => {
    const fila = await newTicket();
    const proprio = await newTicket(atendente.id);

    const r1 = await api.request('PUT', `/tickets/${fila}`, {token: atendente.token, body: {status: 'EM_ATENDIMENTO'}});
    const r2 = await api.request('PUT', `/tickets/${proprio}`, {token: atendente.token, body: {priority: 'ALTA'}});

    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
});

test('atendente pode pegar para si ou devolver à fila, mas não atribuir a outro', async () => {
    const id = await newTicket();

    const toSelf = await api.request('PUT', `/tickets/${id}`, {token: atendente.token, body: {assignedTo: atendente.id}});
    const toOther = await api.request('PUT', `/tickets/${id}`, {token: atendente.token, body: {assignedTo: outro.id}});
    const toQueue = await api.request('PUT', `/tickets/${id}`, {token: atendente.token, body: {assignedTo: null}});

    assert.equal(toSelf.status, 200);
    assert.equal(toOther.status, 403);
    assert.equal(toQueue.status, 200);
});

test('gestor reatribui ticket de qualquer atendente', async () => {
    const id = await newTicket(outro.id);
    const res = await api.request('PUT', `/tickets/${id}`, {token: gestor.token, body: {assignedTo: atendente.id}});

    assert.equal(res.status, 200);
    assert.equal(res.body.assignedTo, atendente.id);
});

test('categorias: atendente só lê; gestor gerencia', async () => {
    const post = await api.request('POST', '/categories', {token: atendente.token, body: {name: 'Nova', color: '#112233'}});
    const put = await api.request('PUT', `/categories/${categoryId}`, {token: atendente.token, body: {name: 'Outro nome'}});
    const del = await api.request('DELETE', `/categories/${categoryId}`, {token: atendente.token});
    const list = await api.request('GET', '/categories', {token: atendente.token});

    assert.deepEqual([post.status, put.status, del.status, list.status], [403, 403, 403, 200]);

    const created = await api.request('POST', '/categories', {token: gestor.token, body: {name: 'Do gestor', color: '#112233'}});
    assert.equal(created.status, 201);
});

test('usuários: gestor lista mas não cria; admin cria; atendente não acessa', async () => {
    const asAtendente = await api.request('GET', '/users', {token: atendente.token});
    const gestorList = await api.request('GET', '/users', {token: gestor.token});
    const body = {name: 'Novo Usuário', email: `novo-${Date.now()}@teste.com`, password: 'Senha@12345', role: 'atendente'};
    const gestorCreate = await api.request('POST', '/users', {token: gestor.token, body});
    const adminCreate = await api.request('POST', '/users', {token: t.admin.token, body});

    assert.deepEqual(
        [asAtendente.status, gestorList.status, gestorCreate.status, adminCreate.status],
        [403, 200, 403, 201],
    );
    assert.equal('passwordHash' in adminCreate.body, false);
});

test('todos os papéis apagam ticket, e a ação fica no /audit', async () => {
    const id = await newTicket(atendente.id);
    const del = await api.request('DELETE', `/tickets/delete/${id}`, {token: atendente.token});
    assert.equal(del.status, 204);

    const audit = await api.request('GET', '/audit', {token: gestor.token});
    const entry = audit.body.find((e: {entityId: string}) => e.entityId === id);

    assert.equal(audit.status, 200);
    assert.equal(entry.action, 'ticket_deleted');
    assert.equal(entry.actorId, atendente.id);
    assert.equal(entry.details.subject, 'Impressora não funciona');
});

test('/audit é bloqueado para atendente', async () => {
    const res = await api.request('GET', '/audit', {token: atendente.token});
    assert.equal(res.status, 403);
});
