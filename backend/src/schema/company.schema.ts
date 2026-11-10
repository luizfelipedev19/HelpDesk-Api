import {z} from 'zod';
import { isValidCnpj, normalizeCnpj } from '../utils/cnpj';


export const createCompanySchema = z.object({
    companyName: z.string().trim().min(2).max(150),
    cnpj: z.string().refine(isValidCnpj, 'CNPJ inválido').transform(normalizeCnpj),
    responsibleName: z.string().trim().min(2).max(150),
    email: z.string().trim().toLowerCase().email().max(150),
    password: z.string().min(8).max(128),
})
.strict();

export const updateCompanySchema = z.object({
    companyName: z.string().trim().min(2).max(150),
})
.strict();

export type UpdateCompanyBody = z.infer<typeof updateCompanySchema>;
export type CreateCompanyBody = z.infer<typeof createCompanySchema>;