import {Request, Response } from 'express';
import { ticketEventsService } from "../service/ticket.events.service";

export const ticketEventsController = {
    async getEvents(req: Request, res: Response) {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

        const companyId = req.user!.companyId;

        res.status(200).json(await ticketEventsService.getEvents(id, companyId));
    }
}