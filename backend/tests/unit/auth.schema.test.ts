import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loginSchema } from '../../src/schema/auth.schema';

test('login: normaliza o e-mail e mantém a senha intacta', () => {
    const parsed = loginSchema.parse({ email: '  USER@Empresa.com ', password: ' senha com espaço ' });

    assert.deepEqual(parsed, { email: 'user@empresa.com', password: ' senha com espaço ' });
});

test('login: rejeita e-mail inválido, senha vazia e campos extras', () => {
    assert.equal(loginSchema.safeParse({ email: 'x', password: 'abc' }).success, false);
    assert.equal(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success, false);
    assert.equal(loginSchema.safeParse({ email: 'a@b.com', password: 'abc', role: 'admin' }).success, false);
});

test('login: limita o tamanho da senha (evita hash de entrada gigante)', () => {
    assert.equal(loginSchema.safeParse({ email: 'a@b.com', password: 'x'.repeat(129) }).success, false);
});
