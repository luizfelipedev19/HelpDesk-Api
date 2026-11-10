import {z} from 'zod';

export const createCategoriesSchama = z
.object({
    name: z.string().trim().min(2, 'Nome da categoria é muito curto').max(50),
    color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida, use #RRGGBB'),
});

export const updateCategoriesSchema = z
.object({
    name: z.string().trim().min(2, 'Nome da categoria é muito curto').max(50),
    color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida, use #RRGGBB').nullable(),
})
.partial()
.refine(d => Object.keys(d).length > 0, 'Nenhum campo para atualizar');

export const categoriesIdParamsSchema = 
z.object({
    id: z.string().uuid('ID inválido'),
});

export type CreateCategoriesBody = z.infer<typeof createCategoriesSchama>;