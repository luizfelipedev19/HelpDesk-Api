import { Router } from "express";
import { companyController } from "../controllers/company.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";


export const companiesRouter = Router();

// Cadastro é público (cria a empresa e o primeiro admin); o resto exige token
companiesRouter.post('/', companyController.create);
companiesRouter.get('/me', authenticate, companyController.findMine);
companiesRouter.put('/me', authenticate, authorize('admin'), companyController.updateMine);
companiesRouter.put('/me/desativar', authenticate, authorize('admin'), companyController.deactivateMine);
