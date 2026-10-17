
import { pool } from "../config/db.config";
import { CompanyRow, PublicCompany, rowToCompany } from "../model/company.model";

export interface CreateCompanyWithAdminInput {
    companyName: string;
    cnpj: string;
    adminName: string;
    adminEmail: string;
    passwordHash: string;
}

const COLUMNS = 'id_company, name, active, cnpj';

export const companyRepository = {
    async createWithAdmin(input: CreateCompanyWithAdminInput) {
        const client = await pool.connect();

        try {
            await client.query('begin');


            const {rows: [company]} = await client.query(
                `insert into companies (name, cnpj)
                values($1, $2)
                returning id_company, name, cnpj, created_at`,
                [input.companyName, input.cnpj],
            );

            const {rows: [admin]} = await client.query (
                `insert into users(company_id, name, email, password_hash, role)
                values($1, $2, $3, $4, 'admin')
                returning id_user, name, email, role, created_at`,
                [company.id_company, input.adminName, input.adminEmail, input.passwordHash],
            );

            await client.query('commit');
            return {company, admin};
        } catch(err) {
            await client.query('rollback');
            throw err;
        } finally {
            client.release();
        }
    },

    async findById(id: string): Promise<PublicCompany | null> {
        const {rows} = await pool.query<CompanyRow>(
            `select ${COLUMNS} from companies where id_company = $1`,
            [id]
        );

        return rows[0] ? rowToCompany(rows[0]) : null;
    }
};