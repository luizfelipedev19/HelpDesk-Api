import { Pool, PoolClient } from "pg";
import {pool} from "../config/db.config";
import { rowToCategories } from "../model/categories.model";
import {CreateTicketInput, Ticket, TicketRow, PublicTicket, rowToTicket, UpdateTicketInput} from "../model/ticket.model";

const COLUMNS = 'id_ticket, subject, description, status, priority, source, category_id, contact_name, contact_email, contact_phone, created_by, assigned_to, created_at, updated_at, closed_at';

export const ticketRepository = {
    async createTicket(input: CreateTicketInput): Promise<Ticket>{
        const {rows} = await pool.query<TicketRow>(
            `insert into tickets (company_id, subject, description, status, priority, source, category_id, contact_name, contact_email, contact_phone, created_by, assigned_to)
            values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            returning ${COLUMNS}`,
            [input.companyId, input.subject, input.description, input.status, input.priority, input.source, input.categoryId, input.contactName, input.contactEmail, input.contactPhone, input.createdBy, input.assignedTo],
        );

        return rowToTicket(rows[0]);
    },

    async findById(id: string, companyId: string, db: Pool | PoolClient = pool): Promise<Ticket | null> {
        const {rows} = await db.query<TicketRow>(
            `select ${COLUMNS} from tickets where id_ticket = $1 and company_id = $2`,
            [id, companyId],
        );

        return rows[0] ? rowToTicket(rows[0]) : null;
    },

    async findAll(companyId: string, limit: number, offset: number): Promise<Ticket[]> {
        const {rows} = await pool.query<TicketRow>(
            `select ${COLUMNS} from tickets
            where company_id = $1 
            limit $2 offset $3`,
            [companyId, limit, offset],
        );

        return rows.map(rowToTicket);
    },

    async updateTicket(id: string, companyId: string, data: UpdateTicketInput, db: Pool | PoolClient = pool): Promise<Ticket | null> {


        const allowed = {subject: 'subject', description: 'description', status: 'status', priority: 'priority', source: 'source', contactPhone: 'contact_phone', contactName: 'contact_name', contactEmail: 'contact_email', assignedTo: 'assigned_to'} as const;

        //aqui acumula os fragmentos do SET, ex: "name = $1"
        const sets: string[] = [];

        //acumula os valores dos parâmetros posicionais $1, $2
        const values: unknown[] = [];

        //percorro com chave e coluna, as colunas permitidas para update
        for(const [key, column] of Object.entries(allowed)) {
            const value = data[key as keyof UpdateTicketInput];
            if(value !== undefined) {
                values.push(value);
                sets.push(`${column} = $${values.length}`);
            }
        }
        
        if(sets.length === 0) return this.findById(id, companyId);

        values.push(id, companyId);
        const {rows} = await db.query<TicketRow>(
            `update tickets 
            set ${sets.join(',')}
            where id_ticket = $${values.length - 1} and company_id = $${values.length}
            returning ${COLUMNS}`,
            values,
        );

        return rows[0] ? rowToTicket(rows[0]) : null;
    },

    async deleteTicket(id: string, companyId: string) {

        //aqui eu digo que cada linha retornada do banco, é do tipo TicketRow

        /**
         * const {rows} = ... — destructuring. O pool.query retorna um objeto QueryResult<TicketRow> com várias         propriedades (rows, rowCount, fields, etc.). Você está puxando só rows (o array de linhas) direto do resultado.
         */
        const {rows} = await pool.query<TicketRow>(
            `delete from tickets  where id_ticket = $1 and company_id = $2`,
            [id, companyId],
        );
    },
}
