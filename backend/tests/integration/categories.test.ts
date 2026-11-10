import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTenant, pool, startServer, ticketBody, Tenant } from './helpers';

let api: Awaited<ReturnType<typeof startServer>>;
let t: Tenant;

before(async () => {
    api = await startServer();
    t = await createTenant();
});

after(() => api.close());

const create = (name: string, color = '#FF8800', token = t.admin.token) =>
    api.request('POST', '/categories', { token, body: { name, color } });

test('cria categoria: 201 com id, nome e cor', async () => {
    const res = await create('Financeiro');

    assert.equal(res.status, 201);
    assert.equal(typeof res.body.id, 'string');
    assert.equal(res.body.nameCategories, 'Financeiro');
    assert.equal(res.body.color, '#FF8800');
});

test('nome repetido na mesma empresa é 409, mas em outra empresa é permitido', async () => {
    await create('Duplicada');
    const dup = await create('Duplicada');
    const other = await createTenant();
    const ok = await create('Duplicada', '#000000', other.admin.token);

    assert.equal(dup.status, 409);
    assert.equal(ok.status, 201);
});

test('criação inválida: cor fora do formato, nome curto e campos faltando retornam 400', async () => {
    const badColor = await create('Valida', 'vermelho');
    const shortName = await create('A');
    const empty = await api.request('POST', '/categories', { token: t.admin.token, body: {} });

    assert.deepEqual([badColor.status, shortName.status, empty.status], [400, 400, 400]);
});

test('GET /categories lista só as da empresa, em ordem alfabética', async () => {
    const tenant = await createTenant();
    for (const name of ['Zeta', 'Alfa', 'Meio']) await create(name, '#112233', tenant.admin.token);
    await create('De outra empresa'); // empresa t

    const list = await api.request('GET', '/categories', { token: tenant.admin.token });

    assert.equal(list.status, 200);
    assert.deepEqual(list.body.map((c: { nameCategories: string }) => c.nameCategories), ['Alfa', 'Meio', 'Zeta']);
});

test('GET /categories/:id: 200, 404 e 400 para id malformado', async () => {
    const { body } = await create('Consultavel');

    const ok = await api.request('GET', `/categories/${body.id}`, { token: t.admin.token });
    const missing = await api.request('GET', '/categories/00000000-0000-4000-8000-000000000000', { token: t.admin.token });
    const malformed = await api.request('GET', '/categories/xyz', { token: t.admin.token });

    assert.equal(ok.status, 200);
    assert.equal(ok.body.nameCategories, 'Consultavel');
    assert.equal(missing.status, 404);
    assert.equal(malformed.status, 400);
});

test('PUT atualiza nome e/ou cor, aceita color null e preserva o que não foi enviado', async () => {
    const { body } = await create('Original', '#111111');

    const renamed = await api.request('PUT', `/categories/${body.id}`, { token: t.admin.token, body: { name: 'Renomeada' } });
    assert.equal(renamed.status, 200);
    assert.equal(renamed.body.nameCategories, 'Renomeada');
    assert.equal(renamed.body.color, '#111111');

    const recolor = await api.request('PUT', `/categories/${body.id}`, { token: t.admin.token, body: { color: '#222222' } });
    assert.equal(recolor.body.color, '#222222');
    assert.equal(recolor.body.nameCategories, 'Renomeada');

    const noColor = await api.request('PUT', `/categories/${body.id}`, { token: t.admin.token, body: { color: null } });
    assert.equal(noColor.body.color, null);
});

test('PUT: body vazio é 400, id inexistente é 404, nome que colide é 409', async () => {
    const a = await create('Cat A');
    const b = await create('Cat B');

    const empty = await api.request('PUT', `/categories/${a.body.id}`, { token: t.admin.token, body: {} });
    const missing = await api.request('PUT', '/categories/00000000-0000-4000-8000-000000000000', { token: t.admin.token, body: { name: 'X1' } });
    const collide = await api.request('PUT', `/categories/${b.body.id}`, { token: t.admin.token, body: { name: 'Cat A' } });

    assert.deepEqual([empty.status, missing.status, collide.status], [400, 404, 409]);
});

test('DELETE: 204, depois 404; id inexistente é 404', async () => {
    const { body } = await create('Descartavel');

    const del = await api.request('DELETE', `/categories/${body.id}`, { token: t.admin.token });
    const get = await api.request('GET', `/categories/${body.id}`, { token: t.admin.token });
    const again = await api.request('DELETE', `/categories/${body.id}`, { token: t.admin.token });

    assert.deepEqual([del.status, get.status, again.status], [204, 404, 404]);
});

test('apagar uma categoria não apaga os tickets dela (categoria fica nula)', async () => {
    const { body: cat } = await create('Com tickets');
    const ticket = await api.request('POST', '/tickets', { token: t.admin.token, body: ticketBody(cat.id) });
    assert.equal(ticket.status, 201);

    await api.request('DELETE', `/categories/${cat.id}`, { token: t.admin.token });

    const still = await api.request('GET', `/tickets/${ticket.body.id}`, { token: t.admin.token });
    assert.equal(still.status, 200);
    assert.equal(still.body.categoryId, null);

    const {rows} = await pool.query(`select category_id from tickets where id_ticket = $1`, [ticket.body.id]);
    assert.equal(rows[0].category_id, null);
});
