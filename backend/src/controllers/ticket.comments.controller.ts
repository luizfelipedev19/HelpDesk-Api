import { Request, Response } from 'express';
import { ticketCommentsService } from '../service/ticket.comments.service';
import { createCommentSchema } from '../schema/ticket.comments.schema';
import { ticketIdParamsSchema } from '../schema/ticket.schema';

export const ticketCommentsController = {
    async create(req: Request, res: Response) {
        const {id} = ticketIdParamsSchema.parse(req.params);
        const body = createCommentSchema.parse(req.body);

        // authorId vem sempre do token, nunca do body
        res.status(201).json(await ticketCommentsService.create(id, req.user!.companyId, req.user!.id, body));
    },

    async list(req: Request, res: Response) {
        const {id} = ticketIdParamsSchema.parse(req.params);

        res.status(200).json(await ticketCommentsService.list(id, req.user!.companyId));
    },
};
