import { once } from 'node:events';
import { AddressInfo } from 'node:net';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import { pool } from '../../src/config/db.config';
import { UserRole } from '../../src/model/user.model';
import { categoriesRepository } from '../../src/repository/categories.repository';
import { companyRepository } from '../../src/repository/company.repository';
import { userRepository } from '../../src/repository/user.repository';

// Trava de segurança: estes testes criam muitos dados, nunca devem rodar no banco de desenvolvimento.
if (!process.env.DB_NAME?.endsWith('_test')) {
    throw new Error('Testes de integração só rodam em banco terminado em "_test". Use --env-file=.env.test');
}

export const PASSWORD = 'Senha@12345';
const passwordHash = argon2.hash(PASSWORD);

export { pool };

export interface ApiResponse {
    status: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: any;
}

export interface TestUser {
    id: string;
    email: string;
    role: UserRole;
    token: string;
}

export interface Tenant {
    companyId: string;
    admin: TestUser;
    createUser(role: UserRole): Promise<TestUser>;
    createCategory(): Promise<string>;
}

export async function startServer() {
    const server = app.listen(0);
    await once(server, 'listening');
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    async function request(method: string, path: string, opts: {token?: string, body?: unknown} = {}): Promise<ApiResponse> {
        const res = await fetch(base + path, {
            method,
            headers: {
                ...(opts.body !== undefined ? {'Content-Type': 'application/json'} : {}),
                ...(opts.token ? {Authorization: `Bearer ${opts.token}`} : {}),
            },
            body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        });

        // rate limiters respondem texto puro; o resto da API responde JSON
        const text = await res.text();
        let parsed: unknown = text || null;
        try { parsed = text ? JSON.parse(text) : null; } catch { /* mantém o texto */ }
        return {status: res.status, body: parsed};
    }

    // Para casos em que o corpo precisa ser enviado cru (ex.: JSON quebrado)
    async function raw(method: string, path: string, body: string, token?: string): Promise<ApiResponse> {
        const res = await fetch(base + path, {
            method,
            headers: {'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {})},
            body,
        });
        const text = await res.text();
        let parsed: unknown = text || null;
        try { parsed = text ? JSON.parse(text) : null; } catch { /* mantém o texto */ }
        return {status: res.status, body: parsed};
    }

    async function close() {
        server.close();
        await pool.end();
    }

    return {request, raw, close};
}

export function tokenFor(user: {id: string, role: UserRole}, companyId: string): string {
    return jwt.sign({sub: user.id, role: user.role, companyId}, process.env.JWT_SECRET!, {algorithm: 'HS256', expiresIn: '1h'});
}

// CNPJ numérico válido e único por chamada (a API valida os dígitos verificadores)
export function makeCnpj(): string {
    const root = String(Math.floor(Math.random() * 1e8)).padStart(8, '0') + '0001';
    const dv = (base: string, weights: number[]) => {
        const sum = base.split('').reduce((acc, ch, i) => acc + Number(ch) * weights[i], 0);
        const rest = sum % 11;
        return rest < 2 ? 0 : 11 - rest;
    };
    const d1 = dv(root, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const d2 = dv(root + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return root + d1 + d2;
}

let seq = 0;

// Cria empresa + admin direto no banco (POST /companies tem rate limit de 5/hora por IP)
// e gera os tokens assinando o JWT (login tem rate limit de tentativas).
export async function createTenant(): Promise<Tenant> {
    const n = `${process.pid}-${Date.now()}-${seq++}`;
    const hash = await passwordHash;

    const {company, admin} = await companyRepository.createWithAdmin({
        companyName: `Empresa ${n}`,
        cnpj: makeCnpj(),
        adminName: 'Admin',
        adminEmail: `admin-${n}@teste.com`,
        passwordHash: hash,
    });

    const companyId: string = company.id_company;

    async function createUser(role: UserRole): Promise<TestUser> {
        const email = `${role}-${n}-${seq++}@teste.com`;
        const user = await userRepository.create({companyId, name: role, email, passwordHash: hash, role});
        return {id: user.id, email, role, token: tokenFor(user, companyId)};
    }

    async function createCategory(): Promise<string> {
        const category = await categoriesRepository.createCategories({
            companyId,
            nameCategories: `Categoria ${n}-${seq++}`,
            color: '#FF8800',
        });
        return category.id;
    }

    return {
        companyId,
        admin: {id: admin.id_user, email: `admin-${n}@teste.com`, role: 'admin', token: tokenFor({id: admin.id_user, role: 'admin'}, companyId)},
        createUser,
        createCategory,
    };
}

export function ticketBody(categoryId: string, overrides: Record<string, unknown> = {}) {
    return {
        subject: 'Impressora não funciona',
        description: 'Descrição do problema',
        categoryId,
        contactName: 'Cliente',
        contactEmail: 'cliente@exemplo.com',
        contactPhone: '11999999999',
        priority: 'MEDIA',
        status: 'ABERTO',
        source: 'MANUAL',
        ...overrides,
    };
}
