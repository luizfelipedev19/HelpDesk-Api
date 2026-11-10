import {Router} from 'express';
import { userController } from '../controllers/user.controller';
import { authorize } from '../middleware/auth.middleware';

export const usersRouter = Router();

//gestor consulta a equipe (para reatribuir tickets); criar e desativar é só do admin
usersRouter.get('/', authorize('admin', 'gestor'), userController.list);
usersRouter.get('/:id', authorize('admin', 'gestor'), userController.getById);
usersRouter.post('/', authorize('admin'), userController.createUser);
usersRouter.put('/desativar/:id', authorize('admin'), userController.desativarUser);

