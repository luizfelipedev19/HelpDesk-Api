import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTicketSchema, updateTicketSchema, ticketIdParamsSchema, listTicketsQuerySchema } from '../../src/schema/ticket.schema';
import { createCommentSchema } from '../../src/schema/ticket.comments.schema';

const validTicket = {
    subject: 'Impressora parada',
    categoryId: '3f2b8c1e-5d4a-4b6e-8a9c-1d2e3f4a5b6c',
    description: 'Não imprime',
    contactPhone: '11999999999',
    contactEmail: 'cliente@exemplo.com',
    contactName: 'Cliente',
    priority: 'MEDIA',
    status: 'ABERTO',
    source: 'MANUAL',
};

test('update rejeita body vazio', () => {
    assert.equal(updateTicketSchema.safeParse({}).success, false);
});

test('update descarta campos que o cliente não pode alterar (companyId, createdBy)', () => {
    const parsed = updateTicketSchema.parse({ status: 'FECHADO', companyId: 'x', createdBy: 'y' });

    assert.deepEqual(parsed, { status: 'FECHADO' });
});

test('update aceita assignedTo null para devolver o ticket à fila', () => {
    assert.deepEqual(updateTicketSchema.parse({ assignedTo: null }), { assignedTo: null });
});

test('update: rejeita enum inválido e assignedTo que não é UUID', () => {
    assert.equal(updateTicketSchema.safeParse({ status: 'qualquer' }).success, false);
    assert.equal(updateTicketSchema.safeParse({ priority: 'ENORME' }).success, false);
    assert.equal(updateTicketSchema.safeParse({ assignedTo: 'abc' }).success, false);
});

test('criação: aceita ticket válido sem assignedTo (fila)', () => {
    assert.equal(createTicketSchema.parse(validTicket).assignedTo, undefined);
});

test('criação: faz trim do assunto e rejeita assunto curto ou longo', () => {
    assert.equal(createTicketSchema.parse({ ...validTicket, subject: '  Oi, ajuda  ' }).subject, 'Oi, ajuda');
    assert.equal(createTicketSchema.safeParse({ ...validTicket, subject: 'a' }).success, false);
    assert.equal(createTicketSchema.safeParse({ ...validTicket, subject: 'x'.repeat(151) }).success, false);
});

test('criação: rejeita enum inválido, UUID inválido e e-mail inválido', () => {
    assert.equal(createTicketSchema.safeParse({ ...validTicket, status: 'aberto' }).success, false);
    assert.equal(createTicketSchema.safeParse({ ...validTicket, priority: 'ENORME' }).success, false);
    assert.equal(createTicketSchema.safeParse({ ...validTicket, source: 'EMAIL' }).success, false);
    assert.equal(createTicketSchema.safeParse({ ...validTicket, categoryId: 'abc' }).success, false);
    assert.equal(createTicketSchema.safeParse({ ...validTicket, contactEmail: 'x' }).success, false);
    assert.equal(createTicketSchema.safeParse({ ...validTicket, assignedTo: 'abc' }).success, false);
});

test('criação: descarta companyId e createdBy enviados pelo cliente', () => {
    const parsed = createTicketSchema.parse({ ...validTicket, companyId: 'x', createdBy: 'y' });

    assert.equal('companyId' in parsed, false);
    assert.equal('createdBy' in parsed, false);
});

test('id do ticket exige UUID', () => {
    assert.equal(ticketIdParamsSchema.safeParse({ id: 'nao-uuid' }).success, false);
    assert.equal(ticketIdParamsSchema.safeParse({ id: validTicket.categoryId }).success, true);
});

test('listagem de tickets: padrão 50/0, máximo 100, converte texto em número', () => {
    assert.deepEqual(listTicketsQuerySchema.parse({}), { limit: 50, offset: 0 });
    assert.deepEqual(listTicketsQuerySchema.parse({ limit: '10', offset: '20' }), { limit: 10, offset: 20 });
    assert.equal(listTicketsQuerySchema.safeParse({ limit: '101' }).success, false);
    assert.equal(listTicketsQuerySchema.safeParse({ offset: '-5' }).success, false);
});

test('comentário: vazio é rejeitado e internal assume false', () => {
    assert.equal(createCommentSchema.safeParse({ body: '   ' }).success, false);
    assert.deepEqual(createCommentSchema.parse({ body: ' oi ' }), { body: 'oi', internal: false });
});

test('comentário: limita a 5000 caracteres, aceita internal e rejeita campos extras', () => {
    assert.equal(createCommentSchema.safeParse({ body: 'x'.repeat(5001) }).success, false);
    assert.equal(createCommentSchema.parse({ body: 'ok', internal: true }).internal, true);
    assert.equal(createCommentSchema.safeParse({ body: 'ok', authorId: 'x' }).success, false);
});
