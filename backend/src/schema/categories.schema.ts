import {z} from 'zod';

export const createCategoriesSchama = z
.object({
    name: z.string().trim().min(2, 'Nome da categoria é muito curto').max(50),
    color: z.string().trim(),
});

export const categoriesIdParamsSchema = 
z.object({
    id: z.string().uuid('ID inválido'),
});

export type CreateCategoriesBody = z.infer<typeof createCategoriesSchama>;