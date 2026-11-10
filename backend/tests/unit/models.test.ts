import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rowToUser, toPublicUser, UserRow } from '../../src/model/user.model';
import { rowToTicket, toPublicTicket, TicketRow, TicketStatus, TicketPriority, TicketSource } from '../../src/model/ticket.model';
import { rowToCategories, toPublicCategories } from '../../src/model/categories.model';
import { rowToCompany, toPublicCompany } from '../../src/model/company.model';
import { rowToTicketEvents, toPublicTicketEvents } from '../../src/model/ticket.events.model';
import { rowToTicketComment } from '../../src/model/ticket.comments.model';

const now = new Date('2026-01-01T10:00:00Z');

test('rowToUser mapeia snake_case para camelCase', () => {
    const row: UserRow = {
        id_user: 'u1', company_id: 'c1', name: 'Maria', email: 'm@e.com', password_hash: 'hash',
        role: 'gestor', active: true, created_at: now, updated_at: null,
    };

    assert.deepEqual(rowToUser(row), {
        id: 'u1', companyId: 'c1', name: 'Maria', email: 'm@e.com', passwordHash: 'hash',
        role: 'gestor', active: true, createdAt: now, updatedAt: null,
    });
});

test('toPublicUser NUNCA expõe o passwordHash', () => {
    const user = rowToUser({
        id_user: 'u1', company_id: 'c1', name: 'Maria', email: 'm@e.com', password_hash: 'segredo',
        role: 'atendente', active: true, created_at: now, updated_at: null,
    });

    const publicUser = toPublicUser(user);

    assert.equal('passwordHash' in publicUser, false);
    assert.equal(JSON.stringify(publicUser).includes('segredo'), false);
    assert.equal(publicUser.email, 'm@e.com');
});

const ticketRow: TicketRow = {
    id_ticket: 't1', company_id: 'c1', subject: 'Assunto', description: 'Desc',
    status: TicketStatus.Aberto, priority: TicketPriority.Alta, source: TicketSource.Manual,
    category_id: 'cat1', contact_name: 'Cli', contact_email: 'c@e.com', contact_phone: '11',
    created_by: 'u1', assigned_to: null,
};

test('rowToTicket mapeia todas as colunas, inclusive company_id e assigned_to nulo', () => {
    assert.deepEqual(rowToTicket(ticketRow), {
        id: 't1', companyId: 'c1', subject: 'Assunto', description: 'Desc',
        status: 'ABERTO', priority: 'ALTA', source: 'MANUAL', categoryId: 'cat1',
        contactName: 'Cli', contactPhone: '11', contactEmail: 'c@e.com',
        createdBy: 'u1', assignedTo: null,
    });
});

test('toPublicTicket devolve uma cópia, não o mesmo objeto', () => {
    const ticket = rowToTicket(ticketRow);
    const copy = toPublicTicket(ticket);

    assert.deepEqual(copy, ticket);
    assert.notEqual(copy, ticket);
});

test('rowToCategories usa id_categories (regressão do typo id_categores)', () => {
    const category = rowToCategories({ id_categories: 'k1', company_id: 'c1', name: 'Suporte', color: '#FF8800' });

    assert.deepEqual(category, { id: 'k1', nameCategories: 'Suporte', color: '#FF8800' });
    assert.deepEqual(toPublicCategories(category), category);
});

test('rowToCompany e toPublicCompany', () => {
    const company = rowToCompany({ id_company: 'c1', name: 'Acme', active: true, cnpj: '11222333000181' });

    assert.deepEqual(company, { id: 'c1', name: 'Acme', active: true, cnpj: '11222333000181' });
    assert.deepEqual(toPublicCompany(company), company);
});

test('rowToTicketEvents preserva valores nulos (ticket desatribuído)', () => {
    const event = rowToTicketEvents({
        id_event: 'e1', ticket_id: 't1', actor_id: 'u1', event_type: 'assigned', old_value: 'u2', new_value: null,
    });

    assert.deepEqual(event, { id: 'e1', ticketId: 't1', actorId: 'u1', eventType: 'assigned', oldValue: 'u2', newValue: null });
    assert.deepEqual(toPublicTicketEvents(event), event);
});

test('rowToTicketComment mapeia autor, flag internal e data', () => {
    const comment = rowToTicketComment({
        id_comment: 'm1', ticket_id: 't1', author_id: 'u1', author_name: 'Maria',
        body: 'Olá', internal: true, created_at: now,
    });

    assert.deepEqual(comment, {
        id: 'm1', ticketId: 't1', authorId: 'u1', authorName: 'Maria', body: 'Olá', internal: true, createdAt: now,
    });
});
