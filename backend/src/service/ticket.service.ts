import { ticketRepository } from "../repository/ticket.repository";
import { CreateTicketBody } from "../schema/ticket.schema";
import { userRepository } from "../repository/user.repository";
import {  PublicTicket, toPublicTicket, UpdateTicketInput, canModifyTicket, TicketStatus, TicketPriority, TicketSource, diffTicket } from "../model/ticket.model";
import { AppError } from "../errors/app-errors";
import { withTransaction } from "../config/db.config";
import { ticketEventsRepository } from "../repository/ticket.events.repository";
import { AuthUser } from "../middleware/auth.middleware";
import { auditRepository } from "../repository/audit.repository";
import { categoriesRepository } from "../repository/categories.repository";



export interface CreateTicket  {
    companyId: string;
    categoryId: string;
    createdBy: string;
    assignedTo: string | null;
    priority: TicketPriority;
    source: TicketSource;
    status: TicketStatus;
    subject: string;
    description: string;
    contactPhone: string;
    contactName: string;
    contactEmail: string;
}

// Garante que o responsável existe, está ativo e pertence à mesma empresa do ticket
async function assertValidAssignee(assigneeId: string, companyId: string) {
    const assignee = await userRepository.findById(assigneeId, companyId);

    if(!assignee || !assignee.active) {
        throw new AppError('Selecione um usuário válido', 400);
    }
}

export const ticketService = {
    async createTicket(input: CreateTicket): Promise<PublicTicket>{
        if(input.assignedTo) {
            await assertValidAssignee(input.assignedTo, input.companyId);
        }

        // sem isso, dava pra apontar o ticket para a categoria de outra empresa
        const category = await categoriesRepository.findById(input.categoryId, input.companyId);
        if(!category) {
            throw new AppError('Categoria inválida', 400);
        }

        const createdTicket = await ticketRepository.createTicket(input);

        return toPublicTicket(createdTicket);
    },

    async findById(id: string, companyId: string): Promise<PublicTicket>{
        const findTicket = await ticketRepository.findById(id, companyId);

        if (!findTicket) {
            throw new AppError('Ticket nao encontrado', 404);
        }

        return toPublicTicket(findTicket);
    },

    async findAll(companyId: string, limit: number, offset: number): Promise<PublicTicket[]> {
        const tickets = await ticketRepository.findAll(companyId, limit, offset);

        return tickets.map((ticket) => toPublicTicket(ticket));
    },

    async updateTicket(id: string, companyId: string, data: UpdateTicketInput, actor: AuthUser): Promise<PublicTicket> {
        const actorId = actor.id;
        if(data.assignedTo) {
            await assertValidAssignee(data.assignedTo, companyId);
        }

        return withTransaction(async (client) => {
            const before = await ticketRepository.findById(id, companyId, client);

            if(!before) {
                throw new AppError('Ticket não encontrado', 404);
            }

            if(!canModifyTicket(actor, before, data)) {
                throw new AppError('Apenas gestor ou admin pode alterar tickets de outro atendente', 403);
            }

            const updated = await ticketRepository.updateTicket(id, companyId, data, client);

            if(!updated) {
                throw new AppError('Não foi possivel atualizar o ticket', 400);
            }

            for(const change of diffTicket(before, data)) {
                await ticketEventsRepository.create({
                    ticketId: id,
                    actorId,
                    eventType: change.eventType,
                    oldValue: change.oldValue,
                    newValue: change.newValue,
                }, client);
            }

            return toPublicTicket(updated);
        });
    },

    async deleteTicket(id: string, companyId: string, actorId: string): Promise<void> {
        // log e delete na mesma transação: não existe exclusão sem registro, nem registro sem exclusão
        await withTransaction(async (client) => {
            const ticket = await ticketRepository.findById(id, companyId, client);

            if(!ticket) {
                throw new AppError('Ticket não encontrado', 404);
            }

            await auditRepository.create({
                companyId,
                actorId,
                action: 'ticket_deleted',
                entityType: 'ticket',
                entityId: id,
                details: ticket, // snapshot, já que o ticket e seus eventos deixam de existir
            }, client);

            await ticketRepository.deleteTicket(id, companyId, client);
        });
    }
}
