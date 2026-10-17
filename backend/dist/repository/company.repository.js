"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyRepository = void 0;
const db_config_1 = require("../config/db.config");
exports.companyRepository = {
    async createWithAdmin(input) {
        const client = await db_config_1.pool.connect();
        try {
            await client.query('begin');
            const { rows: [company] } = await client.query(`insert into companies (name, cnpj)
                values($1, $2)
                returning id_company, name, cnpj, created_at`, [input.companyName, input.cnpj]);
            const { rows: [admin] } = await client.query(`insert into users(company_id, name, email, password_hash, role)
                values($1, $2, $3, $4, 'admin')
                returning id_user, name, email, role, created_at`, [company.id_company, input.adminName, input.adminEmail, input.passwordHash]);
            await client.query('commit');
            return { company, admin };
        }
        catch (err) {
            await client.query('rollback');
            throw err;
        }
        finally {
            client.release();
        }
    },
};
