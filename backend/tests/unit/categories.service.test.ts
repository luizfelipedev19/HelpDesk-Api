import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { categoriesService } from '../../src/service/categories.service';
import { categoriesRepository } from '../../src/repository/categories.repository';
import { AppError } from '../../src/errors/app-errors';

afterEach(() => {
    mock.restoreAll();
});

const category = { id: 'k1', nameCategories: 'Suporte', color: '#FF8800' };
const isAppError = (status: number) => (err: unknown) => err instanceof AppError && err.statusCode === status;
const duplicate = () => Object.assign(new Error('dup'), { code: '23505' });

test('create: usa a empresa do token, faz trim e devolve a categoria', async () => {
    const create = mock.method(categoriesRepository, 'createCategories', async () => category);

    const result = await categoriesService.createCategories({ name: '  Suporte ', color: ' #FF8800 ' }, 'c1');

    assert.deepEqual(create.mock.calls[0].arguments[0], { companyId: 'c1', nameCategories: 'Suporte', color: '#FF8800' });
    assert.deepEqual(result, category);
});

test('create: nome repetido na empresa (23505) vira 409; outros erros propagam', async () => {
    mock.method(categoriesRepository, 'createCategories', async () => { throw duplicate(); });
    await assert.rejects(categoriesService.createCategories({ name: 'Suporte', color: '#FF8800' }, 'c1'), isAppError(409));

    mock.method(categoriesRepository, 'createCategories', async () => { throw new Error('boom'); });
    await assert.rejects(categoriesService.createCategories({ name: 'Suporte', color: '#FF8800' }, 'c1'), /boom/);
});

test('getById: 404 quando não existe', async () => {
    mock.method(categoriesRepository, 'findById', async () => null);
    await assert.rejects(categoriesService.getBydId('k1', 'c1'), isAppError(404));

    mock.method(categoriesRepository, 'findById', async () => category);
    assert.deepEqual(await categoriesService.getBydId('k1', 'c1'), category);
});

test('list: devolve as categorias da empresa', async () => {
    const list = mock.method(categoriesRepository, 'listCategories', async () => [category]);

    assert.deepEqual(await categoriesService.listCategories('c1'), [category]);
    assert.deepEqual(list.mock.calls[0].arguments, ['c1']);
});

test('update: 404 se não existir, 409 se o nome colidir, sucesso devolve a categoria', async () => {
    mock.method(categoriesRepository, 'updateCategories', async () => null);
    await assert.rejects(categoriesService.updateCategories('k1', 'c1', { name: 'X' }), isAppError(404));

    mock.method(categoriesRepository, 'updateCategories', async () => { throw duplicate(); });
    await assert.rejects(categoriesService.updateCategories('k1', 'c1', { name: 'X' }), isAppError(409));

    mock.method(categoriesRepository, 'updateCategories', async () => category);
    assert.deepEqual(await categoriesService.updateCategories('k1', 'c1', { name: 'Suporte' }), category);
});

test('delete: 404 quando nada foi removido', async () => {
    mock.method(categoriesRepository, 'deleteCategories', async () => false);
    await assert.rejects(categoriesService.deleteCategories('k1', 'c1'), isAppError(404));

    mock.method(categoriesRepository, 'deleteCategories', async () => true);
    await assert.doesNotReject(categoriesService.deleteCategories('k1', 'c1'));
});
