import { Router } from "express";
import { ticketController } from "../controllers/ticket.controller";
import { ticketEventsController } from "../controllers/ticket.events.controller";

export const ticketRouter = Router();


ticketRouter.post('/', ticketController.create);
ticketRouter.get('/:id', ticketController.findById);
ticketRouter.get('/', ticketController.findAll);
ticketRouter.get('/:id/events', ticketEventsController.getEvents)
ticketRouter.delete('/delete/:id', ticketController.delete);