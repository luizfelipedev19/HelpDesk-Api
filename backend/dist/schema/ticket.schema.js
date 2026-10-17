"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketIdParamsSchema = exports.createTicketSchema = void 0;
const zod_1 = require("zod");
const ticket_model_1 = require("../model/ticket.model");
exports.createTicketSchema = zod_1.z
    .object({
    subject: zod_1.z.string().trim().min(2, 'O assunto é muito curto').max(150),
    categoryId: zod_1.z.string().uuid('categoria inválida'),
    assignedTo: zod_1.z.string().uuid('Atendente inválido').optional(),
    description: zod_1.z.string().trim(),
    contactPhone: zod_1.z.string().trim(),
    contactEmail: zod_1.z.string().trim().max(150).email(),
    contactName: zod_1.z.string().trim().max(150),
    priority: zod_1.z.enum(ticket_model_1.TicketPriority),
    status: zod_1.z.enum(ticket_model_1.TicketStatus),
    source: zod_1.z.enum(ticket_model_1.TicketSource),
});
exports.ticketIdParamsSchema = zod_1.z
    .object({
    id: zod_1.z.string().uuid('Id inválido'),
});
