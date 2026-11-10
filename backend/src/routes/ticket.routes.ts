import { Router } from "express";
import { ticketController } from "../controllers/ticket.controller";
import { ticketEventsController } from "../controllers/ticket.events.controller";
import { ticketCommentsController } from "../controllers/ticket.comments.controller";

export const ticketRouter = Router();


ticketRouter.post('/', ticketController.create);
ticketRouter.get('/', ticketController.findAll);
ticketRouter.get('/:id', ticketController.findById);
ticketRouter.put('/:id', ticketController.update);
ticketRouter.get('/:id/events', ticketEventsController.getEvents);
ticketRouter.get('/:id/comments', ticketCommentsController.list);
ticketRouter.post('/:id/comments', ticketCommentsController.create);
ticketRouter.delete('/delete/:id', ticketController.delete);
