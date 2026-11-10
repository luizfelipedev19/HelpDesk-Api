export interface TicketComment {
    id: string;
    ticketId: string;
    authorId: string;
    authorName: string;
    body: string;
    internal: boolean;
    createdAt: Date;
}

export interface CreateCommentInput {
    ticketId: string;
    authorId: string;
    body: string;
    internal: boolean;
}

export interface TicketCommentRow {
    id_comment: string;
    ticket_id: string;
    author_id: string;
    author_name: string;
    body: string;
    internal: boolean;
    created_at: Date;
}

export function rowToTicketComment(row: TicketCommentRow): TicketComment {
    return {
        id: row.id_comment,
        ticketId: row.ticket_id,
        authorId: row.author_id,
        authorName: row.author_name,
        body: row.body,
        internal: row.internal,
        createdAt: row.created_at,
    };
}
