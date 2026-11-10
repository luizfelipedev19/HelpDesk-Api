import { AppError } from "../errors/app-errors";
import { TicketComment } from "../model/ticket.comments.model";
import { ticketCommentsRepository } from "../repository/ticket.comments.repository";
import { ticketRepository } from "../repository/ticket.repository";
import { CreateCommentBody } from "../schema/ticket.comments.schema";

// Valida o tenant: a tabela de comentários só conhece o ticket, então é o ticket que prova a empresa.
async function assertTicketInCompany(ticketId: string, companyId: string) {
    const ticket = await ticketRepository.findById(ticketId, companyId);

    if(!ticket) {
        throw new AppError('Ticket não encontrado', 404);
    }
}

export const ticketCommentsService = {
    async create(ticketId: string, companyId: string, authorId: string, input: CreateCommentBody): Promise<TicketComment> {
        await assertTicketInCompany(ticketId, companyId);

        return ticketCommentsRepository.create({
            ticketId,
            authorId,
            body: input.body,
            internal: input.internal,
        });
    },

    async list(ticketId: string, companyId: string): Promise<TicketComment[]> {
        await assertTicketInCompany(ticketId, companyId);

        return ticketCommentsRepository.listByTicket(ticketId);
    },
};
