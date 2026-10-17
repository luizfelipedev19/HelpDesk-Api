"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = void 0;
const db_config_1 = require("../config/db.config");
const user_model_1 = require("../model/user.model");
const COLUMNS = 'id_user, company_id, name, email, password_hash, role, active, created_at, updated_at';
exports.userRepository = {
    //função para criar o usuario
    async create(input) {
        const { rows } = await db_config_1.pool.query(`insert into users(company_id, name, email, password_hash, role)
            values($1, $2, $3, $4, $5)
            returning ${COLUMNS}`, [input.companyId, input.name, input.email, input.passwordHash, input.role]);
        return (0, user_model_1.rowToUser)(rows[0]);
    },
    async findById(id, companyId) {
        const { rows } = await db_config_1.pool.query(`select name, email, role, active from users where id_user = $1 and company_id = $2`, [id, companyId]);
        return rows[0] ? (0, user_model_1.rowToUser)(rows[0]) : null;
    },
    async findByEmail(email) {
        const { rows } = await db_config_1.pool.query(`select ${COLUMNS} name, email, role, active from users where email = $1`, [email]);
        return rows[0] ? (0, user_model_1.rowToUser)(rows[0]) : null;
    },
    async list(companyId, limit = 20, offset = 0) {
        const { rows } = await db_config_1.pool.query(`select ${COLUMNS} from users where company_id = $1 and active = true order by created_at desc limit $2 offset $3`, [companyId, limit, offset]);
        return rows.map(user_model_1.rowToUser);
    },
    async desactive(id, companyId) {
        const { rows } = await db_config_1.pool.query(`update  users set active = false, updated_at = now() where id_user = $1 and company_id = $2`, [id, companyId]);
    },
};
