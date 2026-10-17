"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUsersQuerySchema = exports.userIdParamsSchema = exports.createUserSchema = exports.useRoleSchema = void 0;
const zod_1 = require("zod");
exports.useRoleSchema = zod_1.z.enum(['atendente', 'gestor']);
exports.createUserSchema = zod_1.z
    .object({
    name: zod_1.z.string().trim().min(2, 'nome muito curto').max(150),
    email: zod_1.z.string().trim().toLowerCase().email('E-mail inválido').max(150),
    password: zod_1.z.string().min(8, 'A senha deve ter pelo menos 8 catacteres').max(128),
    role: exports.useRoleSchema,
})
    .strict(); //vai rejeitar os campos extras no body
exports.userIdParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid('ID Inválido'),
});
exports.listUsersQuerySchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    offset: zod_1.z.coerce.number().int().min(0).default(0),
});
