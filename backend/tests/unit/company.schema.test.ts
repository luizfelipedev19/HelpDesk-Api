import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCompanySchema, updateCompanySchema } from '../../src/schema/company.schema';

const valid = {
    companyName: 'Acme Ltda',
    cnpj: '11.222.333/0001-81',
    responsibleName: 'Fulano de Tal',
    email: 'Fulano@Acme.com',
    password: 'Senha@12345',
};

test('cadastro: normaliza CNPJ (sem máscara) e e-mail (minúsculo)', () => {
    const parsed = createCompanySchema.parse(valid);

    assert.equal(parsed.cnpj, '11222333000181');
    assert.equal(parsed.email, 'fulano@acme.com');
});

test('cadastro: rejeita CNPJ inválido', () => {
    assert.equal(createCompanySchema.safeParse({ ...valid, cnpj: '11.222.333/0001-82' }).success, false);
});

test('cadastro: rejeita senha curta, nome curto e campos extras', () => {
    assert.equal(createCompanySchema.safeParse({ ...valid, password: '1234567' }).success, false);
    assert.equal(createCompanySchema.safeParse({ ...valid, companyName: 'A' }).success, false);
    assert.equal(createCompanySchema.safeParse({ ...valid, role: 'admin' }).success, false);
});

test('update: só aceita companyName (CNPJ é imutável)', () => {
    assert.deepEqual(updateCompanySchema.parse({ companyName: '  Novo Nome ' }), { companyName: 'Novo Nome' });
    assert.equal(updateCompanySchema.safeParse({ companyName: 'Novo', cnpj: '11222333000181' }).success, false);
    assert.equal(updateCompanySchema.safeParse({}).success, false);
});
