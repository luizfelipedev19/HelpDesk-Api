import {Request, Response} from 'express';
import { authService } from '../service/auth.service';
import { loginSchema } from '../schema/auth.schema';

export const authController = {
    async loginAgent(req: Request, res: Response){
        const {email, password} = loginSchema.parse(req.body);

        res.json(await authService.login(email, password, ['atendente', 'gestor']));
    },

    async loginAdmin(req: Request, res: Response){
        const {email, password} = loginSchema.parse(req.body);

        res.json(await authService.login(email, password, ['admin']));
    },
};