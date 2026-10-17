import {Router} from 'express';
import { userController } from '../controllers/user.controller';
import { authorize } from '../middleware/auth.middleware';

export const usersRouter = Router();

usersRouter.use(authorize('admin'));

//rotas do usuário
usersRouter.post('/', userController.createUser);
usersRouter.get('/', userController.list);
usersRouter.get('/:id', userController.getById);
usersRouter.put('/desativar/:id', userController.desativarUser);

