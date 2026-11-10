import { Request, Response } from 'express';
import { companyService } from '../service/company.service';
import { createCompanySchema, updateCompanySchema } from '../schema/company.schema';

export const companyController = {
    async create(req: Request, res: Response) {
        const body = createCompanySchema.parse(req.body);
        res.status(201).json(await companyService.register(body));
    },

    // A empresa sempre vem do token: ninguém consulta ou altera dados de outro tenant
    async findMine(req: Request, res: Response) {
        res.status(200).json(await companyService.findById(req.user!.companyId));
    },

    async updateMine(req: Request, res: Response) {
        const {companyName} = updateCompanySchema.parse(req.body);

        res.status(200).json(await companyService.updateName(req.user!.companyId, companyName));
    },

    async deactivateMine(req: Request, res: Response) {
        await companyService.deactivate(req.user!.companyId);
        res.status(204).send();
    }
};