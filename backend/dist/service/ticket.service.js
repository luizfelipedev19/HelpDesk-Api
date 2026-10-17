"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketService = void 0;
const ticket_repository_1 = require("../repository/ticket.repository");
const user_repository_1 = require("../repository/user.repository");
const ticket_model_1 = require("../model/ticket.model");
const app_errors_1 = require("../errors/app-errors");
exports.ticketService = {
    async createTicket(input) {
        try {
            if (input.assignedTo) {
                const assignee = await user_repository_1.userRepository.findById(input.assignedTo, input.companyId);
                if (!assignee) {
                    throw new app_errors_1.AppError('Selecione um usuário válido', 400);
                }
            }
            const createdTicket = await ticket_repository_1.ticketRepository.createTicket({
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
            return (0, ticket_model_1.toPublicTicket)(createdTicket);
        }
        catch (error) {
            throw new app_errors_1.AppError('Nao foi possivel criar o ticket', 400);
        }
    },
    async findById(id, companyId) {
        const findTicket = await ticket_repository_1.ticketRepository.findById(id, companyId);
        if (!findTicket) {
            throw new app_errors_1.AppError('Ticket nao encontrado', 404);
        }
        return (0, ticket_model_1.toPublicTicket)(findTicket);
    },
    async findAll(companyId, limit, offset) {
        const findAllTicket = await ticket_repository_1.ticketRepository.findAll(companyId, limit, offset);
        if (!findAllTicket) {
            throw new app_errors_1.AppError('Não foi possivel listar os tickets', 400);
        }
        return findAllTicket.map((ticket) => (0, ticket_model_1.toPublicTicket)(ticket));
    },
    async updateTicket(id, companyId, data) {
        try {
            const updatedTicket = await ticket_repository_1.ticketRepository.updateTicket(id, companyId, data);
            if (!updatedTicket) {
                throw new app_errors_1.AppError('Ticket nao encontrado', 404);
            }
            return (0, ticket_model_1.toPublicTicket)(updatedTicket);
        }
        catch (error) {
            throw error;
        }
    },
    async deleteTicket(id, companyId) {
        await ticket_repository_1.ticketRepository.deleteTicket(id, companyId);
    }
};
