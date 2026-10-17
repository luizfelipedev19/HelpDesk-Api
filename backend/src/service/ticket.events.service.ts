import { AppError } from "../errors/app-errors";
import { TicketEvents, toPublicTicketEvents } from "../model/ticket.events.model";
import { ticketEventsRepository } from "../repository/ticket.events.repository"
import { ticketRepository } from "../repository/ticket.repository";
export const ticketEventsService = {
    async getEvents(ticketId: string, companyId: string): Promise<TicketEvents[]> {

        const ticket = await ticketRepository.findById(ticketId, companyId)

        if(!ticket){
            throw new AppError('Não foi possível encontrar o ticket', 404);
        }

        const events = await ticketEventsRepository.getEvents(ticketId);

        if(!events){
            throw new AppError('Não foi possível listar os eventos', 400);
        }

        return events.map((ticket) => toPublicTicketEvents(ticket));

    }
}