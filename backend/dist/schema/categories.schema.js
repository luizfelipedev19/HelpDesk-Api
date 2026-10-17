"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoriesIdParamsSchema = exports.createCategoriesSchama = void 0;
const zod_1 = require("zod");
exports.createCategoriesSchama = zod_1.z
    .object({
    name: zod_1.z.string().trim().min(2, 'Nome da categoria é muito curto').max(50),
    color: zod_1.z.string().trim(),
});
exports.categoriesIdParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid('ID inválido'),
});
