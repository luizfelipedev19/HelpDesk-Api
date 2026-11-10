import { pool } from "../config/db.config";
import { CreateCommentInput, TicketComment, TicketCommentRow, rowToTicketComment } from "../model/ticket.comments.model";

// O nome do autor vem do join; a tabela de comentários não tem company_id,
// então o isolamento por empresa é checado no service via ticket.
const SELECT = `select c.id_comment, c.ticket_id, c.author_id, u.name as author_name, c.body, c.internal, c.created_at
    from ticket_comments c
    join users u on u.id_user = c.author_id`;

export const ticketCommentsRepository = {
    async create(input: CreateCommentInput): Promise<TicketComment> {
        const {rows: [created]} = await pool.query<{id_comment: string}>(
            `insert into ticket_comments (ticket_id, author_id, body, internal)
            values ($1, $2, $3, $4)
            returning id_comment`,
            [input.ticketId, input.authorId, input.body, input.internal],
        );

        const {rows} = await pool.query<TicketCommentRow>(
            `${SELECT} where c.id_comment = $1`,
            [created.id_comment],
        );

        return rowToTicketComment(rows[0]);
    },

    async listByTicket(ticketId: string): Promise<TicketComment[]> {
        const {rows} = await pool.query<TicketCommentRow>(
            `${SELECT} where c.ticket_id = $1 order by c.created_at asc`,
            [ticketId],
        );

        return rows.map(rowToTicketComment);
    },
};
