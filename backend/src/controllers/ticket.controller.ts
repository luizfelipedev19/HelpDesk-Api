import { Request, Response } from "express";
import { ticketService } from "../service/ticket.service";
import { createTicketSchema, updateTicketSchema, ticketIdParamsSchema, listTicketsQuerySchema } from "../schema/ticket.schema";
import { AppError } from "../errors/app-errors";


export const ticketController = {
    async create(req: Request, res: Response) {

        //valido se existe usuário autenticado
        if (!req.user) {
            throw new AppError('Não autenticado', 401);
        }

        //capturo o id do usuario e sua empresa
        const { id: userId, companyId } = req.user;
        const body = createTicketSchema.parse(req.body);

        res.status(201).json(await ticketService.createTicket({
            ...body,
            companyId: companyId,
            createdBy: userId,
            assignedTo: body.assignedTo ?? null,
        }));
    },

    async findById(req: Request, res: Response) {
        const {id} = ticketIdParamsSchema.parse(req.params);
        res.status(200).json(await ticketService.findById(id, req.user!.companyId));
    },

    async findAll(req: Request, res: Response) {
        const {limit, offset} = listTicketsQuerySchema.parse(req.query);

        res.status(200).json(await ticketService.findAll(req.user!.companyId, limit, offset));
    },

    async update(req: Request, res: Response) {
        const {id} = ticketIdParamsSchema.parse(req.params);
        const data = updateTicketSchema.parse(req.body);

        res.status(200).json(await ticketService.updateTicket(id, req.user!.companyId, data, req.user!));
    },

    async delete(req: Request, res: Response) {
        const {id} = ticketIdParamsSchema.parse(req.params);

        await ticketService.deleteTicket(id, req.user!.companyId, req.user!.id);
        res.status(204).send();
    }
}
