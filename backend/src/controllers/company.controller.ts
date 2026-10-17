import { Request, Response } from 'express';
import { companyService } from '../service/company.service';
import { createCompanySchema } from '../schema/company.schema';

export const companyController = {
    async create(req: Request, res: Response) {
        const body = createCompanySchema.parse(req.body);
        res.status(201).json(await companyService.register(body));
    },

    async findById(req: Request, res: Response) {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

        res.status(200).json(await companyService.findById(id));
    }
};