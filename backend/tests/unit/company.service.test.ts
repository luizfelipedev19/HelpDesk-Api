import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import argon2 from 'argon2';
import { companyService } from '../../src/service/company.service';
import { companyRepository } from '../../src/repository/company.repository';
import { AppError } from '../../src/errors/app-errors';

afterEach(() => {
    mock.restoreAll();
});

const isAppError = (status: number, message?: string) => (err: unknown) =>
    err instanceof AppError && err.statusCode === status && (message === undefined || err.message === message);

const input = {
    companyName: '  Acme  ',
    cnpj: '11222333000181',
    responsibleName: '  Fulano ',
    email: 'f@acme.com',
    password: 'Senha@12345',
};

const created = {
    company: { id_company: 'c1', name: 'Acme', cnpj: '11222333000181', created_at: new Date() },
    admin: { id_user: 'u1', name: 'Fulano', email: 'f@acme.com', role: 'admin', created_at: new Date(), password_hash: 'NUNCA' },
};

test('register: cria empresa + admin com senha em hash e devolve só dados públicos', async () => {
    const create = mock.method(companyRepository, 'createWithAdmin', async () => created);

    const result = await companyService.register(input);

    const arg = create.mock.calls[0].arguments[0] as { companyName: string; adminName: string; passwordHash: string };
    assert.equal(arg.companyName, 'Acme');
    assert.equal(arg.adminName, 'Fulano');
    assert.equal(await argon2.verify(arg.passwordHash, 'Senha@12345'), true);

    assert.deepEqual(result, {
        company: { id: 'c1', name: 'Acme', cnpj: '11222333000181' },
        admin: { id: 'u1', name: 'Fulano', email: 'f@acme.com', role: 'admin' },
    });
    assert.equal(JSON.stringify(result).includes('NUNCA'), false);
});

test('register: CNPJ duplicado e e-mail duplicado viram 409 com mensagens distintas', async () => {
    const dup = (constraint: string) => Object.assign(new Error('dup'), { code: '23505', constraint });

    mock.method(companyRepository, 'createWithAdmin', async () => { throw dup('companies_cnpj_key'); });
    await assert.rejects(companyService.register(input), isAppError(409, 'CNPJ já cadastrado'));

    mock.method(companyRepository, 'createWithAdmin', async () => { throw dup('users_email_key'); });
    await assert.rejects(companyService.register(input), isAppError(409, 'E-mail já cadastrado'));
});

test('register: violação de outra constraint e erros desconhecidos são propagados', async () => {
    mock.method(companyRepository, 'createWithAdmin', async () => { throw Object.assign(new Error('outra'), { code: '23505', constraint: 'outra_key' }); });
    await assert.rejects(companyService.register(input), /outra/);

    mock.method(companyRepository, 'createWithAdmin', async () => { throw new Error('boom'); });
    await assert.rejects(companyService.register(input), /boom/);
});

test('findById e updateName: 404 quando a empresa não existe', async () => {
    mock.method(companyRepository, 'findById', async () => null);
    mock.method(companyRepository, 'updateName', async () => null);

    await assert.rejects(companyService.findById('c1'), isAppError(404));
    await assert.rejects(companyService.updateName('c1', 'Novo'), isAppError(404));
});

test('findById e updateName devolvem a empresa quando existe', async () => {
    const company = { id: 'c1', name: 'Acme', active: true, cnpj: '1' };
    mock.method(companyRepository, 'findById', async () => company);
    mock.method(companyRepository, 'updateName', async () => ({ ...company, name: 'Novo' }));

    assert.deepEqual(await companyService.findById('c1'), company);
    assert.equal((await companyService.updateName('c1', 'Novo')).name, 'Novo');
});

test('deactivate delega ao repository com o id da empresa', async () => {
    const deactivate = mock.method(companyRepository, 'deactivate', async () => {});

    await companyService.deactivate('c1');

    assert.deepEqual(deactivate.mock.calls[0].arguments, ['c1']);
});
