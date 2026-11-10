import { test, mock, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { authService } from '../../src/service/auth.service';
import { userRepository } from '../../src/repository/user.repository';
import { companyRepository } from '../../src/repository/company.repository';
import { AppError } from '../../src/errors/app-errors';
import { User } from '../../src/model/user.model';

const SECRET = 'segredo-de-teste';
const PASSWORD = 'Senha@12345';
let passwordHash: string;

before(async () => {
    passwordHash = await argon2.hash(PASSWORD);
});

beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
});

afterEach(() => {
    mock.restoreAll();
});

const makeUser = (overrides: Partial<User> = {}): User => ({
    id: 'u1', companyId: 'c1', name: 'Maria', email: 'm@e.com', passwordHash,
    role: 'atendente', active: true, createdAt: new Date(), updatedAt: null,
    ...overrides,
});

function arrange(user: User | null, companyActive = true) {
    mock.method(userRepository, 'findByEmail', async () => user);
    mock.method(companyRepository, 'findById', async () => ({ id: 'c1', name: 'Acme', active: companyActive, cnpj: '1' }));
}

const invalidCredentials = (err: unknown) =>
    err instanceof AppError && err.statusCode === 401 && err.message === 'Credenciais inválidas';

test('login válido devolve JWT HS256 com sub, role e companyId', async () => {
    arrange(makeUser());

    const { token } = await authService.login('m@e.com', PASSWORD, ['atendente']);
    const decoded = jwt.verify(token, SECRET, { algorithms: ['HS256'] }) as jwt.JwtPayload;

    assert.equal(decoded.sub, 'u1');
    assert.equal(decoded.role, 'atendente');
    assert.equal(decoded.companyId, 'c1');
    assert.equal(decoded.exp! - decoded.iat!, 8 * 60 * 60);
});

test('o token nunca carrega o hash da senha', async () => {
    arrange(makeUser());

    const { token } = await authService.login('m@e.com', PASSWORD, ['atendente']);

    assert.equal(JSON.stringify(jwt.decode(token)).includes('passwordHash'), false);
});

test('usuário inexistente, senha errada, usuário inativo, papel não permitido e empresa inativa dão o MESMO 401', async () => {
    arrange(null);
    await assert.rejects(authService.login('x@e.com', PASSWORD, ['atendente']), invalidCredentials);

    arrange(makeUser());
    await assert.rejects(authService.login('m@e.com', 'senha-errada', ['atendente']), invalidCredentials);

    arrange(makeUser({ active: false }));
    await assert.rejects(authService.login('m@e.com', PASSWORD, ['atendente']), invalidCredentials);

    arrange(makeUser({ role: 'admin' }));
    await assert.rejects(authService.login('m@e.com', PASSWORD, ['atendente', 'gestor']), invalidCredentials);

    arrange(makeUser(), false);
    await assert.rejects(authService.login('m@e.com', PASSWORD, ['atendente']), invalidCredentials);
});

test('gestor entra quando o papel está na lista permitida', async () => {
    arrange(makeUser({ role: 'gestor' }));

    const { token } = await authService.login('m@e.com', PASSWORD, ['atendente', 'gestor']);

    assert.equal((jwt.decode(token) as jwt.JwtPayload).role, 'gestor');
});

test('usuário inexistente ainda gasta tempo de hash (mitiga enumeração por tempo)', async () => {
    arrange(null);
    const hash = mock.method(argon2, 'hash', async () => 'x');

    await assert.rejects(authService.login('x@e.com', PASSWORD, ['atendente']), invalidCredentials);

    assert.equal(hash.mock.callCount(), 1);
});

test('sem JWT_SECRET configurado, o login falha com erro de configuração', async () => {
    delete process.env.JWT_SECRET;
    arrange(makeUser());

    await assert.rejects(authService.login('m@e.com', PASSWORD, ['atendente']), /JWT_SECRET/);
});
