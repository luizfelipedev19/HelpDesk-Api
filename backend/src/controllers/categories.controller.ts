import {Request, Response} from 'express';
import { categoriesService } from '../service/categories.service';
import { createCategoriesSchama, categoriesIdParamsSchema, updateCategoriesSchema } from '../schema/categories.schema';

export const categoriesController = { 
    async create(req: Request, res: Response) {
        const body = createCategoriesSchama.parse(req.body);

        res.status(201).json(await categoriesService.createCategories(body, req.user!.companyId));
    },

    async getById(req: Request, res: Response) {
        const {id} = categoriesIdParamsSchema.parse(req.params);
        res.status(200).json(await categoriesService.getBydId(id, req.user!.companyId));
    },
    async listAll(req: Request, res: Response) {
        res.status(200).json(await categoriesService.listCategories(req.user!.companyId));
    },

    async updateCategories(req: Request, res: Response) {
        const {id} = categoriesIdParamsSchema.parse(req.params);
        const data = updateCategoriesSchema.parse(req.body);
        res.status(200).json(await categoriesService.updateCategories(id, req.user!.companyId, data));
    },

    async deleteCategories(req: Request, res: Response) {
        const {id} = categoriesIdParamsSchema.parse(req.params);
        await categoriesService.deleteCategories(id, req.user!.companyId);
        res.status(204).send();
    }
}