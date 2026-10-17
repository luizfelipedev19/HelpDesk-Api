import {z} from 'zod';
import { TicketPriority, TicketStatus, TicketSource } from '../model/ticket.model';

export const createTicketSchema = z
.object ({
    subject: z.string().trim().min(2, 'O assunto é muito curto').max(150),
    categoryId: z.string().uuid('categoria inválida'),
    assignedTo: z.string().uuid('Atendente inválido').optional(),
    description: z.string().trim(),
    contactPhone: z.string().trim(),
    contactEmail: z.string().trim().max(150).email(),
    contactName: z.string().trim().max(150),
    priority: z.enum(TicketPriority),
    status: z.enum(TicketStatus),
    source: z.enum(TicketSource),
});

export const ticketIdParamsSchema = z
.object({
    id: z.string().uuid('Id inválido'),
});

export type CreateTicketBody = z.infer<typeof createTicketSchema>;