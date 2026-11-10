import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidCnpj, normalizeCnpj } from '../../src/utils/cnpj';

test('normaliza removendo máscara', () => {
    assert.equal(normalizeCnpj('11.222.333/0001-81'), '11222333000181');
});

test('aceita CNPJ válido, com ou sem máscara', () => {
    assert.equal(isValidCnpj('11.222.333/0001-81'), true);
    assert.equal(isValidCnpj('11222333000181'), true);
});

test('rejeita dígito verificador errado e sequência repetida', () => {
    assert.equal(isValidCnpj('11.222.333/0001-82'), false);
    assert.equal(isValidCnpj('11111111111111'), false);
});

test('aceita CNPJ alfanumérico (formato novo) e normaliza para maiúsculas', () => {
    assert.equal(isValidCnpj('12.ABC.345/01DE-35'), true);
    assert.equal(normalizeCnpj('12.abc.345/01de-35'), '12ABC34501DE35');
});

test('rejeita tamanho errado, letra nos dígitos verificadores e texto vazio', () => {
    assert.equal(isValidCnpj('1122233300018'), false);
    assert.equal(isValidCnpj('112223330001811'), false);
    assert.equal(isValidCnpj('12ABC34501DEAB'), false);
    assert.equal(isValidCnpj(''), false);
});
