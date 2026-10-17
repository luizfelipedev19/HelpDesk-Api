import {Request, Response} from 'express';
import { authService } from '../service/auth.service';
import { loginSchema } from '../schema/auth.schema';

export const authController = {
    async loginAgent(req: Request, res: Response){
        const {email, password} = loginSchema.parse(req.body);

        res.json(await authService.login(email, password, ['atendente']));
    },

    async loginAdmin(req: Request, res: Response){
        const {email, password} = loginSchema.parse(req.body);
        console.log('loginAdmin called with email:', email);
        console.log('loginAdmin called with password:', password); // Debugging line

        res.json(await authService.login(email, password, ['admin']));
    },
};