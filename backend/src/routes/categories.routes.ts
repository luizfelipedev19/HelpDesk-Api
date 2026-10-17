import { Router } from 'express';
import { categoriesController } from '../controllers/categories.controller';

export const categoriesRouter = Router();

categoriesRouter.post('/', categoriesController.create);
categoriesRouter.get('/:id', categoriesController.getById);
categoriesRouter.get('/', categoriesController.listAll);
categoriesRouter.put('/', categoriesController.updateCategories);
categoriesRouter.delete('/', categoriesController.deleteCategories);