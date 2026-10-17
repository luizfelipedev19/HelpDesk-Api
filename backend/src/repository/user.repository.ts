import {pool} from '../config/db.config';
import { CreateUserInput, User, UserRow, PublicUser, rowToUser } from '../model/user.model';

const COLUMNS = 'id_user, company_id, name, email, password_hash, role, active, created_at, updated_at';

export const userRepository = {
    //função para criar o usuario
    async create(input: CreateUserInput): Promise<User> {
        const {rows} = await pool.query<UserRow>(
            `insert into users(company_id, name, email, password_hash, role)
            values($1, $2, $3, $4, $5)
            returning ${COLUMNS}`,
            [input.companyId, input.name, input.email, input.passwordHash, input.role],
        );
        return rowToUser(rows[0]);
    },

    async findById(id: string, companyId: string): Promise<User | null>{
        const {rows} = await pool.query<UserRow>(
            `select name, email, role, active from users where id_user = $1 and company_id = $2`, [id, companyId],
        );

        return rows[0] ? rowToUser(rows[0]) : null;
    },

    async findByEmail(email: string): Promise<User | null>{
        const {rows} = await pool.query<UserRow>(
            `select ${COLUMNS} name, email, role, active from users where email = $1`, [email],
        );

        return rows[0] ? rowToUser(rows[0]) : null;
    },

    async list(companyId: string, limit = 20, offset = 0): Promise<User[]> {
        const {rows} = await pool.query<UserRow>(
            `select ${COLUMNS} from users where company_id = $1 and active = true order by created_at desc limit $2 offset $3`,
            [companyId, limit, offset],
        );

        return rows.map(rowToUser);
    },

    async desactive(id: string, companyId: string): Promise<void> {
        const {rows} = await pool.query<UserRow>(
            `update  users set active = false, updated_at = now() where id_user = $1 and company_id = $2`, [id, companyId],
        );
    },
};