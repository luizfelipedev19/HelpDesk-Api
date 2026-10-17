import { Router } from "express";
import { companyController } from "../controllers/company.controller";


export const companiesRouter = Router();
companiesRouter.post('/', companyController.create);
companiesRouter.get('/:id', companyController.findById);