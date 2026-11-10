import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTenant, pool, startServer, ticketBody, Tenant, TestUser } from './helpers';

let api: Awaited<ReturnType<typeof startServer>>;
let t: Tenant;
let agent: TestUser;
let categoryId: string;

before(async () => {
    api = await startServer();
    t = await createTenant();
    agent = await t.createUser('atendente');
    categoryId = await t.createCategory();
});

after(() => api.close());

async function newTicket(overrides: Record<string, unknown> = {}) {
    const res = await api.request('POST', '/tickets', {token: t.admin.token, body: ticketBody(categoryId, overrides)});
    assert.equal(res.status, 201);
    return res.body;
}

test('cria ticket usando empresa e criador do token, ignorando o que vier no body', async () => {
    const ticket = await newTicket({companyId: '00000000-0000-0000-0000-000000000000', createdBy: agent.id});

    assert.equal(ticket.companyId, t.companyId);
    assert.equal(ticket.createdBy, t.admin.id);
    assert.equal(ticket.contactName, 'Cliente');
    assert.equal(ticket.contactEmail, 'cliente@exemplo.com');
    assert.equal(ticket.assignedTo, null);
});

test('body inválido retorna 400 com detalhe por campo', async () => {
    const res = await api.request('POST', '/tickets', {token: t.admin.token, body: ticketBody(categoryId, {contactEmail: 'invalido', subject: 'a'})});

    assert.equal(res.status, 400);
    const fields = res.body.errors.map((e: {field: string}) => e.field);
    assert.ok(fields.includes('contactEmail') && fields.includes('subject'));
});

test('listagem pagina e vem do mais recente para o mais antigo', async () => {
    const tenant = await createTenant();
    const cat = await tenant.createCategory();
    const ids: string[] = [];
    for (const subject of ['primeiro', 'segundo', 'terceiro']) {
        const res = await api.request('POST', '/tickets', {token: tenant.admin.token, body: ticketBody(cat, {subject})});
        ids.push(res.body.id);
    }

    const page = await api.request('GET', '/tickets?limit=2', {token: tenant.admin.token});
    const rest = await api.request('GET', '/tickets?limit=2&offset=2', {token: tenant.admin.token});

    assert.deepEqual(page.body.map((x: {subject: string}) => x.subject), ['terceiro', 'segundo']);
    assert.deepEqual(rest.body.map((x: {subject: string}) => x.subject), ['primeiro']);
});

test('update muda status/prioridade e gera um evento por campo alterado', async () => {
    const ticket = await newTicket();

    const res = await api.request('PUT', `/tickets/${ticket.id}`, {
        token: t.admin.token,
        body: {status: 'EM_ATENDIMENTO', priority: 'MEDIA'}, // priority igual à atual: não deve gerar evento
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'EM_ATENDIMENTO');

    const events = await api.request('GET', `/tickets/${ticket.id}/events`, {token: t.admin.token});
    assert.equal(events.body.length, 1);
    assert.deepEqual(
        {type: events.body[0].eventType, old: events.body[0].oldValue, new: events.body[0].newValue, actor: events.body[0].actorId},
        {type: 'status_changed', old: 'ABERTO', new: 'EM_ATENDIMENTO', actor: t.admin.id},
    );
});

test('assignedTo: null devolve o ticket à fila e registra o evento', async () => {
    const ticket = await newTicket({assignedTo: agent.id});

    const res = await api.request('PUT', `/tickets/${ticket.id}`, {token: t.admin.token, body: {assignedTo: null}});
    assert.equal(res.status, 200);
    assert.equal(res.body.assignedTo, null);

    const events = await api.request('GET', `/tickets/${ticket.id}/events`, {token: t.admin.token});
    assert.equal(events.body[0].eventType, 'assigned');
    assert.equal(events.body[0].oldValue, agent.id);
    assert.equal(events.body[0].newValue, null);
});

test('closed_at é preenchido ao fechar e limpo ao reabrir', async () => {
    const ticket = await newTicket();
    const closedAt = async () => (await pool.query(`select closed_at from tickets where id_ticket = $1`, [ticket.id])).rows[0].closed_at;

    await api.request('PUT', `/tickets/${ticket.id}`, {token: t.admin.token, body: {status: 'FECHADO'}});
    assert.notEqual(await closedAt(), null);

    await api.request('PUT', `/tickets/${ticket.id}`, {token: t.admin.token, body: {status: 'ABERTO'}});
    assert.equal(await closedAt(), null);
});

test('update rejeita body vazio e não deixa trocar a empresa do ticket', async () => {
    const ticket = await newTicket();
    const other = await createTenant();

    const empty = await api.request('PUT', `/tickets/${ticket.id}`, {token: t.admin.token, body: {}});
    assert.equal(empty.status, 400);

    const res = await api.request('PUT', `/tickets/${ticket.id}`, {token: t.admin.token, body: {priority: 'ALTA', companyId: other.companyId}});
    assert.equal(res.status, 200);
    assert.equal(res.body.companyId, t.companyId);
});

test('delete remove o ticket, registra snapshot no audit_log e o log sobrevive à remoção', async () => {
    const ticket = await newTicket({subject: 'Para apagar'});
    await api.request('PUT', `/tickets/${ticket.id}`, {token: t.admin.token, body: {status: 'FECHADO'}});

    const del = await api.request('DELETE', `/tickets/delete/${ticket.id}`, {token: agent.token});
    assert.equal(del.status, 204);
    assert.equal((await api.request('GET', `/tickets/${ticket.id}`, {token: t.admin.token})).status, 404);

    const {rows} = await pool.query(`select * from audit_log where entity_id = $1`, [ticket.id]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].actor_id, agent.id);
    assert.equal(rows[0].company_id, t.companyId);
    assert.equal(rows[0].details.subject, 'Para apagar');

    const events = await pool.query(`select 1 from ticket_events where ticket_id = $1`, [ticket.id]);
    assert.equal(events.rowCount, 0); // eventos somem em cascata: por isso o audit_log existe
});

test('delete de ticket inexistente é 404 e de id malformado é 400', async () => {
    const missing = await api.request('DELETE', '/tickets/delete/00000000-0000-4000-8000-000000000000', {token: t.admin.token});
    const malformed = await api.request('DELETE', '/tickets/delete/nao-e-uuid', {token: t.admin.token});

    assert.equal(missing.status, 404);
    assert.equal(malformed.status, 400);
});

test('comentários: autor vem do token, internal assume false e a lista vem em ordem cronológica', async () => {
    const ticket = await newTicket();

    const first = await api.request('POST', `/tickets/${ticket.id}/comments`, {token: agent.token, body: {body: '  primeiro  '}});
    const second = await api.request('POST', `/tickets/${ticket.id}/comments`, {token: t.admin.token, body: {body: 'nota', internal: true}});

    assert.equal(first.status, 201);
    assert.equal(first.body.authorId, agent.id);
    assert.equal(first.body.body, 'primeiro');
    assert.equal(first.body.internal, false);
    assert.equal(second.body.internal, true);

    const list = await api.request('GET', `/tickets/${ticket.id}/comments`, {token: agent.token});
    assert.deepEqual(list.body.map((c: {body: string}) => c.body), ['primeiro', 'nota']);
});

test('GET de ticket inexistente é 404 e de id malformado é 400', async () => {
    const missing = await api.request('GET', '/tickets/00000000-0000-4000-8000-000000000000', {token: t.admin.token});
    const malformed = await api.request('GET', '/tickets/abc', {token: t.admin.token});

    assert.equal(missing.status, 404);
    assert.equal(malformed.status, 400);
});

test('PUT em ticket inexistente é 404 e com id malformado é 400', async () => {
    const missing = await api.request('PUT', '/tickets/00000000-0000-4000-8000-000000000000', {token: t.admin.token, body: {status: 'FECHADO'}});
    const malformed = await api.request('PUT', '/tickets/abc', {token: t.admin.token, body: {status: 'FECHADO'}});

    assert.equal(missing.status, 404);
    assert.equal(malformed.status, 400);
});

test('ticket recém-criado não tem eventos; ticket inexistente dá 404 nos eventos', async () => {
    const ticket = await newTicket();

    const events = await api.request('GET', `/tickets/${ticket.id}/events`, {token: t.admin.token});
    const missing = await api.request('GET', '/tickets/00000000-0000-4000-8000-000000000000/events', {token: t.admin.token});

    assert.deepEqual(events.body, []);
    assert.equal(missing.status, 404);
});

test('não dá para atribuir ticket a usuário desativado (criação e update)', async () => {
    const inactive = await t.createUser('atendente');
    await api.request('PUT', `/users/desativar/${inactive.id}`, {token: t.admin.token});

    const create = await api.request('POST', '/tickets', {token: t.admin.token, body: ticketBody(categoryId, {assignedTo: inactive.id})});
    const ticket = await newTicket();
    const update = await api.request('PUT', `/tickets/${ticket.id}`, {token: t.admin.token, body: {assignedTo: inactive.id}});

    assert.equal(create.status, 400);
    assert.equal(update.status, 400);
});

test('update com valor inválido é 400 e não altera o ticket', async () => {
    const ticket = await newTicket();

    const res = await api.request('PUT', `/tickets/${ticket.id}`, {token: t.admin.token, body: {status: 'aberto'}});
    const after = await api.request('GET', `/tickets/${ticket.id}`, {token: t.admin.token});

    assert.equal(res.status, 400);
    assert.equal(after.body.status, 'ABERTO');
});

test('update atualiza updated_at', async () => {
    const ticket = await newTicket();
    const before = (await pool.query(`select updated_at from tickets where id_ticket = $1`, [ticket.id])).rows[0].updated_at;
    assert.equal(before, null);

    await api.request('PUT', `/tickets/${ticket.id}`, {token: t.admin.token, body: {priority: 'URGENTE'}});

    const after = (await pool.query(`select updated_at from tickets where id_ticket = $1`, [ticket.id])).rows[0].updated_at;
    assert.notEqual(after, null);
});

test('comentário em ticket inexistente é 404', async () => {
    const res = await api.request('POST', '/tickets/00000000-0000-4000-8000-000000000000/comments', {token: agent.token, body: {body: 'oi'}});

    assert.equal(res.status, 404);
});

test('comentário vazio ou com authorId no body é rejeitado', async () => {
    const ticket = await newTicket();

    const empty = await api.request('POST', `/tickets/${ticket.id}/comments`, {token: agent.token, body: {body: '   '}});
    const forged = await api.request('POST', `/tickets/${ticket.id}/comments`, {token: agent.token, body: {body: 'oi', authorId: t.admin.id}});

    assert.equal(empty.status, 400);
    assert.equal(forged.status, 400);
});
