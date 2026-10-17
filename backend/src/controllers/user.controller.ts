import {Request, Response} from 'express';
import { userService } from '../service/user.service';
import{
    createUserSchema,
    listUsersQuerySchema,
    userIdParamsSchema,
} from '../schema/user.schema';

export const userController = {
    async createUser(req: Request, res: Response) {
        const body = createUserSchema.parse(req.body);
        const user = await userService.register(body, req.user!.companyId);
        res.status(201).json(user);
    },


    async list(req: Request, res: Response) {
        const {limit, offset} = listUsersQuerySchema.parse(req.query);
        res.json(await userService.list(req.user!.companyId, limit, offset));
    },

    async getById(req: Request, res: Response){
        const {id} = userIdParamsSchema.parse(req.params);
        res.json(await userService.getById(id, req.user!.companyId));
    },

    async desativarUser(req: Request, res: Response) {
        const {id} = userIdParamsSchema.parse(req.params);
        await userService.desactive(id, req.user!.companyId);
        res.status(204).send();
    }
};