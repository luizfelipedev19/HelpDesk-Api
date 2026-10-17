import { ticketRepository } from "../repository/ticket.repository";
import { CreateTicketBody } from "../schema/ticket.schema";
import { userRepository } from "../repository/user.repository";
import {  PublicTicket, toPublicTicket, UpdateTicketInput, TicketStatus, TicketPriority, TicketSource, diffTicket } from "../model/ticket.model";
import { AppError } from "../errors/app-errors";
import { withTransaction } from "../config/db.config";
import { ticketEventsRepository } from "../repository/ticket.events.repository";



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

export const ticketService = {
    async  createTicket(input: CreateTicket): Promise<PublicTicket>{
        try{

            if(input.assignedTo){

                const assignee = await userRepository.findById(input.assignedTo, input.companyId);

                if(!assignee) {
                    throw new AppError('Selecione um usuário válido', 400);
                }
                
            }
            const createdTicket = await ticketRepository.createTicket({
                priority: input.priority,
                companyId: input.companyId,
                categoryId: input.categoryId,
                createdBy: input.createdBy,
                source: input.source,
                assignedTo: input.assignedTo,
                subject: input.subject,
                description: input.description,
                status: input.status,
                contactPhone: input.contactPhone,
            });
            return toPublicTicket(createdTicket);
        } catch (error) {
            throw new AppError('Nao foi possivel criar o ticket', 400)
        }
    },

    async findById(id: string, companyId: string): Promise<PublicTicket>{
        const findTicket = await ticketRepository.findById(id, companyId);

        if (!findTicket) {
            throw new AppError('Ticket nao encontrado', 404);
        }

        return toPublicTicket(findTicket);
    },


    async findAll(companyId: string, limit: number, offset: number): Promise<PublicTicket[]> {
        const findAllTicket = await ticketRepository.findAll(companyId, limit, offset);

        if(!findAllTicket) {
            throw new AppError('Não foi possivel listar os tickets', 400);
        }

        return findAllTicket.map((ticket) => toPublicTicket(ticket));
    },

    async updateTicket(id: string, companyId: string, data: UpdateTicketInput, actorId: string): Promise<PublicTicket> {
        
        return withTransaction(async (client) => {
            const before = await ticketRepository.findById(id, companyId, client);

            if(!before) {
                throw new AppError('Ticket não encontrado', 404);
            }
                const updated = await ticketRepository.updateTicket(id, companyId, data, client);

                if(!updated) {
                    throw new AppError('Não foi possivel atualziar o ticket', 400);
                }

                const changes = diffTicket(before, data); //função pura que compara campo a campo


                for(const change of changes) {
                    await ticketEventsRepository.create({
                        ticketId: id,
                        actorId, 
                        eventType: change.field, //ex: 'status_change
                        oldValue: String(change.oldValue),
                        newValue: String(change.newValue),
                    }, client);
                }
            return toPublicTicket(updated);
        });
    },
    async deleteTicket(id: string, companyId: string): Promise<void> {
        await ticketRepository.deleteTicket(id, companyId);
    }
}