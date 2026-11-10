import { Router } from 'express';
import { categoriesController } from '../controllers/categories.controller';
import { authorize } from '../middleware/auth.middleware';

export const categoriesRouter = Router();

categoriesRouter.post('/', authorize('admin', 'gestor'), categoriesController.create);
categoriesRouter.get('/:id', categoriesController.getById);
categoriesRouter.get('/', categoriesController.listAll);
categoriesRouter.put('/:id', authorize('admin', 'gestor'), categoriesController.updateCategories);
categoriesRouter.delete('/:id', authorize('admin', 'gestor'), categoriesController.deleteCategories);