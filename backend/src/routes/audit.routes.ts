import { Router, Request, Response } from "express";
import { authorize } from "../middleware/auth.middleware";
import { auditRepository } from "../repository/audit.repository";
import { listTicketsQuerySchema } from "../schema/ticket.schema";

export const auditRouter = Router();

auditRouter.use(authorize('admin', 'gestor'));

auditRouter.get('/', async (req: Request, res: Response) => {
    const {limit, offset} = listTicketsQuerySchema.parse(req.query);

    res.json(await auditRepository.list(req.user!.companyId, limit, offset));
});
