import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCategoriesSchama, updateCategoriesSchema, categoriesIdParamsSchema } from '../../src/schema/categories.schema';

test('criação: aceita nome e cor #RRGGBB', () => {
    assert.deepEqual(createCategoriesSchama.parse({ name: '  Suporte ', color: '#FF8800' }), { name: 'Suporte', color: '#FF8800' });
});

test('criação: rejeita cor fora do formato e nome curto', () => {
    for (const color of ['FF8800', '#FFF', '#GGGGGG', 'red', '']) {
        assert.equal(createCategoriesSchama.safeParse({ name: 'Suporte', color }).success, false, color);
    }
    assert.equal(createCategoriesSchama.safeParse({ name: 'S', color: '#FF8800' }).success, false);
});

test('criação: nome limitado a 50 caracteres', () => {
    assert.equal(createCategoriesSchama.safeParse({ name: 'x'.repeat(51), color: '#FF8800' }).success, false);
});

test('update: parcial, aceita color null e rejeita body vazio', () => {
    assert.deepEqual(updateCategoriesSchema.parse({ color: null }), { color: null });
    assert.deepEqual(updateCategoriesSchema.parse({ name: 'Novo' }), { name: 'Novo' });
    assert.equal(updateCategoriesSchema.safeParse({}).success, false);
});

test('id da categoria exige UUID', () => {
    assert.equal(categoriesIdParamsSchema.safeParse({ id: '123' }).success, false);
});
