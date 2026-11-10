import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import argon2 from 'argon2';
import { userService } from '../../src/service/user.service';
import { userRepository } from '../../src/repository/user.repository';
import { AppError } from '../../src/errors/app-errors';
import { User } from '../../src/model/user.model';

afterEach(() => {
    mock.restoreAll();
});

const makeUser = (overrides: Partial<User> = {}): User => ({
    id: 'u1', companyId: 'c1', name: 'Maria', email: 'm@e.com', passwordHash: 'hash',
    role: 'atendente', active: true, createdAt: new Date(), updatedAt: null,
    ...overrides,
});

const isAppError = (status: number) => (err: unknown) => err instanceof AppError && err.statusCode === status;

test('register: guarda hash argon2 (nunca a senha), usa a empresa do token e normaliza o e-mail', async () => {
    const create = mock.method(userRepository, 'create', async (input: { passwordHash: string }) => makeUser({ passwordHash: input.passwordHash }));

    const result = await userService.register(
        { name: '  Maria  ', email: ' MARIA@E.com ', password: 'Senha@12345', role: 'gestor' },
        'empresa-1',
    );

    const input = create.mock.calls[0].arguments[0] as { companyId: string; name: string; email: string; passwordHash: string; role: string };
    assert.equal(input.companyId, 'empresa-1');
    assert.equal(input.name, 'Maria');
    assert.equal(input.email, 'maria@e.com');
    assert.notEqual(input.passwordHash, 'Senha@12345');
    assert.equal(await argon2.verify(input.passwordHash, 'Senha@12345'), true);
    assert.equal('passwordHash' in result, false);
});

test('register: e-mail duplicado (23505) vira 409', async () => {
    mock.method(userRepository, 'create', async () => { throw Object.assign(new Error('dup'), { code: '23505' }); });

    await assert.rejects(
        userService.register({ name: 'Maria', email: 'm@e.com', password: 'Senha@12345', role: 'atendente' }, 'c1'),
        isAppError(409),
    );
});

test('register: outros erros do banco são propagados sem alteração', async () => {
    mock.method(userRepository, 'create', async () => { throw new Error('conexão caiu'); });

    await assert.rejects(
        userService.register({ name: 'Maria', email: 'm@e.com', password: 'Senha@12345', role: 'atendente' }, 'c1'),
        /conexão caiu/,
    );
});

test('getById: inexistente ou inativo vira 404; ativo volta sem passwordHash', async () => {
    mock.method(userRepository, 'findById', async () => null);
    await assert.rejects(userService.getById('u1', 'c1'), isAppError(404));

    mock.method(userRepository, 'findById', async () => makeUser({ active: false }));
    await assert.rejects(userService.getById('u1', 'c1'), isAppError(404));

    mock.method(userRepository, 'findById', async () => makeUser());
    const user = await userService.getById('u1', 'c1');
    assert.equal(user.id, 'u1');
    assert.equal('passwordHash' in user, false);
});

test('list: repassa paginação e remove passwordHash de todos', async () => {
    const list = mock.method(userRepository, 'list', async () => [makeUser(), makeUser({ id: 'u2' })]);

    const users = await userService.list('c1', 10, 5);

    assert.deepEqual(list.mock.calls[0].arguments, ['c1', 10, 5]);
    assert.equal(users.length, 2);
    assert.ok(users.every((u) => !('passwordHash' in u)));
});

test('desactive: chama o repository para usuário ativo e dá 404 se não existir', async () => {
    const desactive = mock.method(userRepository, 'desactive', async () => {});

    mock.method(userRepository, 'findById', async () => makeUser());
    await userService.desactive('u1', 'c1');
    assert.deepEqual(desactive.mock.calls[0].arguments, ['u1', 'c1']);

    mock.method(userRepository, 'findById', async () => null);
    await assert.rejects(userService.desactive('u9', 'c1'), isAppError(404));
    assert.equal(desactive.mock.callCount(), 1);
});
