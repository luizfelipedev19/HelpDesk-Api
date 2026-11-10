import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createUserSchema, userIdParamsSchema, listUsersQuerySchema} from '../../src/schema/user.schema';

const valid = {
    name: 'Luiz Felipe',
    email: 'luz@teste.com.br',
    password: '12345678',
    role: 'atendente',
};


test('aceita usuário válido', () => {
    assert.equal(createUserSchema.safeParse(valid).success, true);
})

test('rejeita usuário com nome muito curto', () => {
    assert.equal(createUserSchema.safeParse({...valid, name: 'a'}).success, false);
})

test('normaliza o e-mail para minúsculas e sem espaços', () => {
    const parsed = createUserSchema.parse({...valid, email: '  LUZ@Teste.COM.br '});

    assert.equal(parsed.email, 'luz@teste.com.br');
});

test('não permite criar admin por esta rota', () => {
    assert.equal(createUserSchema.safeParse({...valid, role: 'admin'}).success, false);
});

test('aceita os papéis atendente e gestor', () => {
    assert.equal(createUserSchema.safeParse({...valid, role: 'gestor'}).success, true);
    assert.equal(createUserSchema.safeParse({...valid, role: 'atendente'}).success, true);
});

test('rejeita senha com menos de 8 caracteres', () => {
    assert.equal(createUserSchema.safeParse({...valid, password: '1234567'}).success, false);
});

test('rejeita e-mail inválido', () => {
    assert.equal(createUserSchema.safeParse({...valid, email: 'sem-arroba'}).success, false);
});

test('rejeita campos extras (strict), como companyId', () => {
    assert.equal(createUserSchema.safeParse({...valid, companyId: 'x'}).success, false);
});

test('userIdParamsSchema exige UUID', () => {
    assert.equal(userIdParamsSchema.safeParse({id: 'abc'}).success, false);
    assert.equal(userIdParamsSchema.safeParse({id: '3f2b8c1e-5d4a-4b6e-8a9c-1d2e3f4a5b6c'}).success, true);
});

test('listUsersQuerySchema aplica padrões, converte texto em número e limita o máximo', () => {
    assert.deepEqual(listUsersQuerySchema.parse({}), {limit: 20, offset: 0});
    assert.deepEqual(listUsersQuerySchema.parse({limit: '5', offset: '10'}), {limit: 5, offset: 10});
    assert.equal(listUsersQuerySchema.safeParse({limit: '101'}).success, false);
    assert.equal(listUsersQuerySchema.safeParse({limit: '0'}).success, false);
    assert.equal(listUsersQuerySchema.safeParse({offset: '-1'}).success, false);
});
