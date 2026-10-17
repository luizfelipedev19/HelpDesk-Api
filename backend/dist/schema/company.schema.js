"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCompanySchema = void 0;
const zod_1 = require("zod");
const cnpj_1 = require("../utils/cnpj");
exports.createCompanySchema = zod_1.z.object({
    companyName: zod_1.z.string().trim().min(2).max(150),
    cnpj: zod_1.z.string().refine(cnpj_1.isValidCnpj, 'CNPJ inválido').transform(cnpj_1.normalizeCnpj),
    responsibleName: zod_1.z.string().trim().min(2).max(150),
    email: zod_1.z.string().trim().toLowerCase().email().max(150),
    password: zod_1.z.string().min(8).max(128),
})
    .strict();
