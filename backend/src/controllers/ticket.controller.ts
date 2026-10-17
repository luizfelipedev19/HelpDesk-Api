import { Request, Response } from "express";
import { ticketService } from "../service/ticket.service";
import { createTicketSchema } from "../schema/ticket.schema";
import { AuthUser } from "../middleware/auth.middleware";
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
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        res.status(200).json(await ticketService.findById(id, req.user!.companyId));
    },

    async findAll(req: Request, res: Response) {
        const limiDefault = 50;
        const offsetDefault = 1;

        const limit = req.body || limiDefault;
        const offset = req.body || offsetDefault;


        res.status(200).json(await ticketService.findAll(req.user!.companyId, limit, offset));
    },

    async update(req: Request, res: Response) {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

        const actorId = req.user!.id;

        const data = req.body;
        res.status(201).json(await ticketService.updateTicket(id, req.user!.companyId, data, actorId));
    },

    async delete(req: Request, res: Response) {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

        res.status(204).json(await ticketService.deleteTicket(id, req.user!.companyId));
    }
}