"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyService = void 0;
const argon2_1 = __importDefault(require("argon2"));
const company_repository_1 = require("../repository/company.repository");
const app_errors_1 = require("../errors/app-errors");
exports.companyService = {
    async register(input) {
        const passwordHash = await argon2_1.default.hash(input.password);
        try {
            const { company, admin } = await company_repository_1.companyRepository.createWithAdmin({
                companyName: input.companyName.trim(),
                cnpj: input.cnpj,
                adminName: input.responsibleName.trim(),
                adminEmail: input.email,
                passwordHash,
            });
            return {
                company: {
                    id: company.id_company,
                    name: company.name,
                    cnpj: company.cnpj,
                },
                admin: {
                    id: admin.id_user,
                    name: admin.name,
                    email: admin.email,
                    role: admin.role,
                },
            };
        }
        catch (err) {
            const e = err;
            if (e.code === '23505') {
                if (e.constraint === 'companies_cnpj_key') {
                    throw new app_errors_1.AppError('CNPJ já cadastrado', 409);
                }
                if (e.constraint === 'users_email_key') {
                    throw new app_errors_1.AppError('E-mail já cadastrado', 409);
                }
            }
            throw err;
        }
    },
};
