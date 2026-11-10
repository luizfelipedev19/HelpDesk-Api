import { z } from 'zod';

export const createCommentSchema = z
.object({
    body: z.string().trim().min(1, 'O comentário não pode ser vazio').max(5000),
    internal: z.boolean().default(false),
})
.strict();

export type CreateCommentBody = z.infer<typeof createCommentSchema>;
