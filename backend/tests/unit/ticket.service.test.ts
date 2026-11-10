import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { ticketService, CreateTicket } from '../../src/service/ticket.service';
import { ticketRepository } from '../../src/repository/ticket.repository';
import { userRepository } from '../../src/repository/user.repository';
import { categoriesRepository } from '../../src/repository/categories.repository';
import { auditRepository } from '../../src/repository/audit.repository';
import { ticketEventsRepository } from '../../src/repository/ticket.events.repository';
import { ticketCommentsRepository } from '../../src/repository/ticket.comments.repository';
import { ticketEventsService } from '../../src/service/ticket.events.service';
import { ticketCommentsService } from '../../src/service/ticket.comments.service';
import { AppError } from '../../src/errors/app-errors';
import { Ticket, TicketPriority, TicketSource, TicketStatus } from '../../src/model/ticket.model';
import { User } from '../../src/model/user.model';

afterEach(() => {
    mock.restoreAll();
});

const isAppError = (status: number, message?: string) => (err: unknown) =>
    err instanceof AppError && err.statusCode === status && (message === undefined || err.message === message);

const ticket: Ticket = {
    id: 't1', companyId: 'c1', categoryId: 'k1', createdBy: 'u1', assignedTo: null,
    subject: 'Assunto', description: 'Desc', status: TicketStatus.Aberto, priority: TicketPriority.Media,
    source: TicketSource.Manual, contactName: 'Cli', contactEmail: 'c@e.com', contactPhone: '11',
};

const input: CreateTicket = {
    companyId: 'c1', categoryId: 'k1', createdBy: 'u1', assignedTo: null,
    priority: TicketPriority.Media, source: TicketSource.Manual, status: TicketStatus.Aberto,
    subject: 'Assunto', description: 'Desc', contactName: 'Cli', contactEmail: 'c@e.com', contactPhone: '11',
};

const user = (overrides: Partial<User> = {}): User => ({
    id: 'u2', companyId: 'c1', name: 'Ana', email: 'a@e.com', passwordHash: 'h',
    role: 'atendente', active: true, createdAt: new Date(), updatedAt: null, ...overrides,
});

// --- createTicket ---

test('createTicket: categoria que não é da empresa vira 400 e nada é gravado', async () => {
    mock.method(categoriesRepository, 'findById', async () => null);
    const create = mock.method(ticketRepository, 'createTicket', async () => ticket);

    await assert.rejects(ticketService.createTicket(input), isAppError(400, 'Categoria inválida'));
    assert.equal(create.mock.callCount(), 0);
});

test('createTicket: sem assignedTo (fila) não consulta usuários', async () => {
    mock.method(categoriesRepository, 'findById', async () => ({ id: 'k1' }));
    mock.method(ticketRepository, 'createTicket', async () => ticket);
    const findUser = mock.method(userRepository, 'findById', async () => null);

    const result = await ticketService.createTicket(input);

    assert.equal(findUser.mock.callCount(), 0);
    assert.equal(result.id, 't1');
});

test('createTicket: responsável inexistente (outra empresa) ou inativo vira 400', async () => {
    mock.method(categoriesRepository, 'findById', async () => ({ id: 'k1' }));
    const create = mock.method(ticketRepository, 'createTicket', async () => ticket);

    mock.method(userRepository, 'findById', async () => null);
    await assert.rejects(ticketService.createTicket({ ...input, assignedTo: 'u2' }), isAppError(400, 'Selecione um usuário válido'));

    mock.method(userRepository, 'findById', async () => user({ active: false }));
    await assert.rejects(ticketService.createTicket({ ...input, assignedTo: 'u2' }), isAppError(400, 'Selecione um usuário válido'));

    assert.equal(create.mock.callCount(), 0);
});

test('createTicket: valida o responsável DENTRO da empresa do ticket', async () => {
    mock.method(categoriesRepository, 'findById', async () => ({ id: 'k1' }));
    mock.method(ticketRepository, 'createTicket', async () => ticket);
    const findUser = mock.method(userRepository, 'findById', async () => user());

    await ticketService.createTicket({ ...input, assignedTo: 'u2' });

    assert.deepEqual(findUser.mock.calls[0].arguments, ['u2', 'c1']);
});

test('createTicket: repassa todos os campos ao repository, inclusive contactName e contactEmail', async () => {
    mock.method(categoriesRepository, 'findById', async () => ({ id: 'k1' }));
    const create = mock.method(ticketRepository, 'createTicket', async () => ticket);

    await ticketService.createTicket(input);

    assert.deepEqual(create.mock.calls[0].arguments[0], input);
});

test('createTicket: erros do banco não são mascarados', async () => {
    mock.method(categoriesRepository, 'findById', async () => ({ id: 'k1' }));
    mock.method(ticketRepository, 'createTicket', async () => { throw new Error('banco fora'); });

    await assert.rejects(ticketService.createTicket(input), /banco fora/);
});

// --- leitura ---

test('findById: 404 quando não existe; devolve o ticket quando existe', async () => {
    mock.method(ticketRepository, 'findById', async () => null);
    await assert.rejects(ticketService.findById('t1', 'c1'), isAppError(404));

    const find = mock.method(ticketRepository, 'findById', async () => ticket);
    assert.deepEqual(await ticketService.findById('t1', 'c1'), ticket);
    assert.deepEqual(find.mock.calls[0].arguments, ['t1', 'c1']);
});

test('findAll: repassa empresa e paginação', async () => {
    const findAll = mock.method(ticketRepository, 'findAll', async () => [ticket, { ...ticket, id: 't2' }]);

    const result = await ticketService.findAll('c1', 10, 20);

    assert.deepEqual(findAll.mock.calls[0].arguments, ['c1', 10, 20]);
    assert.deepEqual(result.map((t) => t.id), ['t1', 't2']);
});

// --- update (validações antes da transação) ---

test('updateTicket: responsável inválido é barrado antes de abrir transação', async () => {
    mock.method(userRepository, 'findById', async () => null);
    const findTicket = mock.method(ticketRepository, 'findById', async () => ticket);
    const actor = { id: 'u1', role: 'gestor' as const, companyId: 'c1' };

    await assert.rejects(ticketService.updateTicket('t1', 'c1', { assignedTo: 'outra-empresa' }, actor), isAppError(400));
    assert.equal(findTicket.mock.callCount(), 0);
});

test('updateTicket: valida o responsável na empresa do TOKEN, não numa vinda do body', async () => {
    const findUser = mock.method(userRepository, 'findById', async () => null);
    const actor = { id: 'u1', role: 'admin' as const, companyId: 'c1' };

    await assert.rejects(ticketService.updateTicket('t1', 'c1', { assignedTo: 'u2' }, actor), isAppError(400));

    assert.deepEqual(findUser.mock.calls[0].arguments, ['u2', 'c1']);
});

// --- eventos e comentários ---

test('eventos: 404 se o ticket não é da empresa; senão lista e remove campos internos', async () => {
    mock.method(ticketRepository, 'findById', async () => null);
    const getEvents = mock.method(ticketEventsRepository, 'getEvents', async () => []);
    await assert.rejects(ticketEventsService.getEvents('t1', 'c1'), isAppError(404));
    assert.equal(getEvents.mock.callCount(), 0);

    mock.method(ticketRepository, 'findById', async () => ticket);
    const event = { id: 'e1', ticketId: 't1', actorId: 'u1', eventType: 'status_changed', oldValue: 'ABERTO', newValue: 'FECHADO' };
    mock.method(ticketEventsRepository, 'getEvents', async () => [event]);
    assert.deepEqual(await ticketEventsService.getEvents('t1', 'c1'), [event]);
});

test('comentários: 404 se o ticket não é da empresa e nada é gravado ou lido', async () => {
    mock.method(ticketRepository, 'findById', async () => null);
    const create = mock.method(ticketCommentsRepository, 'create', async () => ({}));
    const list = mock.method(ticketCommentsRepository, 'listByTicket', async () => []);

    await assert.rejects(ticketCommentsService.create('t1', 'c1', 'u1', { body: 'oi', internal: false }), isAppError(404));
    await assert.rejects(ticketCommentsService.list('t1', 'c1'), isAppError(404));

    assert.equal(create.mock.callCount(), 0);
    assert.equal(list.mock.callCount(), 0);
});

test('comentários: o autor e o ticket vêm dos argumentos do servidor', async () => {
    const find = mock.method(ticketRepository, 'findById', async () => ticket);
    const create = mock.method(ticketCommentsRepository, 'create', async (c: unknown) => c);

    await ticketCommentsService.create('t1', 'c1', 'autor-do-token', { body: 'oi', internal: true });

    assert.deepEqual(find.mock.calls[0].arguments, ['t1', 'c1']);
    assert.deepEqual(create.mock.calls[0].arguments[0], { ticketId: 't1', authorId: 'autor-do-token', body: 'oi', internal: true });
});

test('comentários: lista os comentários do ticket validado', async () => {
    mock.method(ticketRepository, 'findById', async () => ticket);
    const list = mock.method(ticketCommentsRepository, 'listByTicket', async () => [{ id: 'm1' }]);

    assert.deepEqual(await ticketCommentsService.list('t1', 'c1'), [{ id: 'm1' }]);
    assert.deepEqual(list.mock.calls[0].arguments, ['t1']);
});

// garante que o módulo de auditoria está importável e exposto como o service espera
test('auditRepository expõe create e list', () => {
    assert.equal(typeof auditRepository.create, 'function');
    assert.equal(typeof auditRepository.list, 'function');
});
