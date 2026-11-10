import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Ticket, TicketPriority, TicketSource, TicketStatus, canModifyTicket, diffTicket } from '../../src/model/ticket.model';

const ticket: Ticket = {
    id: 't1',
    companyId: 'c1',
    categoryId: 'cat1',
    createdBy: 'u1',
    assignedTo: 'u2',
    subject: 'assunto',
    description: 'descrição',
    status: TicketStatus.Aberto,
    priority: TicketPriority.Media,
    source: TicketSource.Manual,
    contactName: 'n',
    contactEmail: 'e@e.com',
    contactPhone: '1',
};

test('só gera evento para o que realmente mudou', () => {
    const changes = diffTicket(ticket, { status: TicketStatus.Fechado, priority: TicketPriority.Media });

    assert.deepEqual(changes, [
        { field: 'status', eventType: 'status_changed', oldValue: 'ABERTO', newValue: 'FECHADO' },
    ]);
});

test('campo ausente no update não gera evento', () => {
    assert.deepEqual(diffTicket(ticket, { subject: 'novo' }), []);
});

test('desatribuir (null) gera evento, mesmo com valor antigo preenchido', () => {
    const [change] = diffTicket(ticket, { assignedTo: null });

    assert.equal(change.eventType, 'assigned');
    assert.equal(change.oldValue, 'u2');
    assert.equal(change.newValue, null);
});

test('atribuir um ticket da fila gera evento com oldValue null', () => {
    const [change] = diffTicket({ ...ticket, assignedTo: null }, { assignedTo: 'u9' });

    assert.deepEqual(change, { field: 'assignedTo', eventType: 'assigned', oldValue: null, newValue: 'u9' });
});

test('vários campos alterados geram um evento por campo', () => {
    const changes = diffTicket(ticket, {
        status: TicketStatus.EmAtendimento,
        priority: TicketPriority.Urgente,
        assignedTo: 'u3',
    });

    assert.deepEqual(changes.map((c) => c.eventType).sort(), ['assigned', 'priority_changed', 'status_changed']);
});

test('valores iguais aos atuais não geram evento', () => {
    assert.deepEqual(diffTicket(ticket, { status: TicketStatus.Aberto, assignedTo: 'u2' }), []);
});

test('campos fora do rastreio (assunto, descrição) nunca geram evento', () => {
    assert.deepEqual(diffTicket(ticket, { subject: 'outro', description: 'outra' }), []);
});

// --- canModifyTicket: regra de permissão do atendente ---

const atendente = { id: 'u1', role: 'atendente' as const };

test('gestor e admin alteram qualquer ticket e podem atribuir a qualquer um', () => {
    for (const role of ['gestor', 'admin'] as const) {
        assert.equal(canModifyTicket({ id: 'x', role }, { assignedTo: 'outro' }, { assignedTo: 'terceiro' }), true, role);
    }
});

test('atendente altera ticket da fila e ticket próprio', () => {
    assert.equal(canModifyTicket(atendente, { assignedTo: null }, {}), true);
    assert.equal(canModifyTicket(atendente, { assignedTo: 'u1' }, {}), true);
});

test('atendente não altera ticket de outro atendente', () => {
    assert.equal(canModifyTicket(atendente, { assignedTo: 'u2' }, {}), false);
});

test('atendente pode pegar para si ou devolver à fila, mas não atribuir a outro', () => {
    assert.equal(canModifyTicket(atendente, { assignedTo: null }, { assignedTo: 'u1' }), true);
    assert.equal(canModifyTicket(atendente, { assignedTo: 'u1' }, { assignedTo: null }), true);
    assert.equal(canModifyTicket(atendente, { assignedTo: null }, { assignedTo: 'u2' }), false);
});

test('atendente não consegue "roubar" ticket de outro nem mandando assignedTo para si', () => {
    assert.equal(canModifyTicket(atendente, { assignedTo: 'u2' }, { assignedTo: 'u1' }), false);
});
