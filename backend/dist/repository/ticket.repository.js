"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketRepository = void 0;
const db_config_1 = require("../config/db.config");
const ticket_model_1 = require("../model/ticket.model");
const COLUMNS = 'id_ticket, subject, description, status, priority, source, category_id, contact_name, contact_email, contact_phone, created_by, assigned_to, created_at, updated_at, closed_at';
exports.ticketRepository = {
    async createTicket(input) {
        const { rows } = await db_config_1.pool.query(`insert into ticket(company_id, subject, description, status, priority, source, category_id, contact_name, contact_email, contact_phone, created_by, assigned_to)
            vales($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            returning ${COLUMNS}`, [input.companyId, input.subject, input.description, input.status, input.priority, input.source, input.categoryId, input.contactName, input.contactEmail, input.contactPhone, input.createdBy, input.assignedTo]);
        return (0, ticket_model_1.rowToTicket)(rows[0]);
    },
    async findById(id, companyId) {
        const { rows } = await db_config_1.pool.query(`select ${COLUMNS} where id_ticket = $1 and company_id = $2`, [id, companyId]);
        return rows[0] ? (0, ticket_model_1.rowToTicket)(rows[0]) : null;
    },
    async findAll(companyId, limit, offset) {
        const { rows } = await db_config_1.pool.query(`select ${COLUMNS} 
            where company_id = $1 
            limit $2 offset $3`, [companyId, limit, offset]);
        return rows.map(ticket_model_1.rowToTicket);
    },
    async updateTicket(id, companyId, data) {
        const allowed = { subject: 'subject', description: 'description', status: 'status', priority: 'priority', source: 'source', contactPhone: 'contactPhone', contactName: 'contactName', contactEmail: 'contactEmail' };
        //aqui acumula os fragmentos do SET, ex: "name = $1"
        const sets = [];
        //acumula os valores dos parâmetros posicionais $1, $2
        const values = [];
        //percorro com chave e coluna, as colunas permitidas para update
        for (const [key, column] of Object.entries(allowed)) {
            const value = data[key];
            if (value !== undefined) {
                values.push(value);
                sets.push(`${column} = $${values.length}`);
            }
        }
        if (sets.length === 0)
            return this.findById(id, companyId);
        values.push(id, companyId);
        const { rows } = await db_config_1.pool.query(`update ticket
            set ${sets.join(',')}
            where id_ticket = $${values.length - 1} and company_id = $${values.length}
            returning ${COLUMNS}`, values);
        return rows[0] ? (0, ticket_model_1.rowToTicket)(rows[0]) : null;
    },
    async deleteTicket(id, companyId) {
        //aqui eu digo que cada linha retornada do banco, é do tipo TicketRow
        /**
         * const {rows} = ... — destructuring. O pool.query retorna um objeto QueryResult<TicketRow> com várias         propriedades (rows, rowCount, fields, etc.). Você está puxando só rows (o array de linhas) direto do resultado.
         */
        const { rows } = await db_config_1.pool.query(`delete from ticket where id_ticket = $1 and company_id = $2`, [id, companyId]);
    },
};
