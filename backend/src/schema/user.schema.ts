import {z} from 'zod';

export const useRoleSchema = z.enum(['atendente', 'gestor']);

export const createUserSchema = z
.object({
    name: z.string().trim().min(2, 'nome muito curto').max(150),
    email: z.string().trim().toLowerCase().email('E-mail inválido').max(150),
    password: z.string().min(8, 'A senha deve ter pelo menos 8 catacteres').max(128),
    role: useRoleSchema,
})
.strict(); //vai rejeitar os campos extras no body

export const userIdParamsSchema = z.object({
    id: z.string().uuid('ID Inválido'),
});

export const listUsersQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});

// Tipo inferido do schema: não precisa escrever a interface à mão

export type CreateUserBody = z.infer<typeof createUserSchema>;
