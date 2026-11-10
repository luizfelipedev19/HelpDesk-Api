import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTenant, startServer, ticketBody, Tenant } from './helpers';

let api: Awaited<ReturnType<typeof startServer>>;
let a: Tenant;
let b: Tenant;
let ticketId: string;
let categoryId: string;

before(async () => {
    api = await startServer();
    a = await createTenant();
    b = await createTenant();
    categoryId = await a.createCategory();

    const created = await api.request('POST', '/tickets', {token: a.admin.token, body: ticketBody(categoryId)});
    assert.equal(created.status, 201);
    ticketId = created.body.id;
});

after(() => api.close());

test('empresa B não lê o ticket da A', async () => {
    const res = await api.request('GET', `/tickets/${ticketId}`, {token: b.admin.token});
    assert.equal(res.status, 404);
});

test('listagem da B não contém tickets da A', async () => {
    const res = await api.request('GET', '/tickets', {token: b.admin.token});
    assert.equal(res.status, 200);
    assert.equal(res.body.some((t: {id: string}) => t.id === ticketId), false);
});

test('empresa B não altera, nem lê eventos do ticket da A', async () => {
    const put = await api.request('PUT', `/tickets/${ticketId}`, {token: b.admin.token, body: {status: 'FECHADO'}});
    const events = await api.request('GET', `/tickets/${ticketId}/events`, {token: b.admin.token});

    assert.equal(put.status, 404);
    assert.equal(events.status, 404);
});

test('empresa B não comenta nem lista comentários do ticket da A', async () => {
    const post = await api.request('POST', `/tickets/${ticketId}/comments`, {token: b.admin.token, body: {body: 'invasão'}});
    const list = await api.request('GET', `/tickets/${ticketId}/comments`, {token: b.admin.token});

    assert.equal(post.status, 404);
    assert.equal(list.status, 404);
});

test('empresa B não apaga o ticket da A (e ele continua existindo)', async () => {
    const del = await api.request('DELETE', `/tickets/delete/${ticketId}`, {token: b.admin.token});
    const still = await api.request('GET', `/tickets/${ticketId}`, {token: a.admin.token});

    assert.equal(del.status, 404);
    assert.equal(still.status, 200);
});

test('não dá para criar ticket com categoria de outra empresa', async () => {
    const res = await api.request('POST', '/tickets', {token: b.admin.token, body: ticketBody(categoryId)});
    assert.equal(res.status, 400);
});

test('não dá para atribuir ticket a usuário de outra empresa (criação e update)', async () => {
    const userOfA = await a.createUser('atendente');
    const ownCategory = await b.createCategory();

    const create = await api.request('POST', '/tickets', {
        token: b.admin.token,
        body: ticketBody(ownCategory, {assignedTo: userOfA.id}),
    });
    assert.equal(create.status, 400);

    const own = await api.request('POST', '/tickets', {token: b.admin.token, body: ticketBody(ownCategory)});
    const update = await api.request('PUT', `/tickets/${own.body.id}`, {token: b.admin.token, body: {assignedTo: userOfA.id}});
    assert.equal(update.status, 400);
});

test('empresa B não acessa categoria da A', async () => {
    const get = await api.request('GET', `/categories/${categoryId}`, {token: b.admin.token});
    const put = await api.request('PUT', `/categories/${categoryId}`, {token: b.admin.token, body: {name: 'Hackeada'}});
    const del = await api.request('DELETE', `/categories/${categoryId}`, {token: b.admin.token});

    assert.deepEqual([get.status, put.status, del.status], [404, 404, 404]);
});

test('admin da B não enxerga usuários da A', async () => {
    const userOfA = await a.createUser('atendente');

    const get = await api.request('GET', `/users/${userOfA.id}`, {token: b.admin.token});
    const list = await api.request('GET', '/users', {token: b.admin.token});

    assert.equal(get.status, 404);
    assert.equal(list.body.some((u: {id: string}) => u.id === userOfA.id), false);
});
