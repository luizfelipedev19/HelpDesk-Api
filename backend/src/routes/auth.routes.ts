import {Router} from 'express';
import { authController } from '../controllers/auth.controller';

export const authRouter = Router();
authRouter.post('/login', authController.loginAgent);

export const superadminRouter = Router();
superadminRouter.post('/login', authController.loginAdmin);