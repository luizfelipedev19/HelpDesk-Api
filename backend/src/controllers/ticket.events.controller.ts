import {Request, Response } from 'express';
import { ticketIdParamsSchema } from "../schema/ticket.schema";
import { ticketEventsService } from "../service/ticket.events.service";

export const ticketEventsController = {
    async getEvents(req: Request, res: Response) {
        const {id} = ticketIdParamsSchema.parse(req.params);

        const companyId = req.user!.companyId;

        res.status(200).json(await ticketEventsService.getEvents(id, companyId));
    }
}