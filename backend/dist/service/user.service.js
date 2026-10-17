"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = void 0;
const argon2_1 = __importDefault(require("argon2"));
const user_repository_1 = require("../repository/user.repository");
const user_model_1 = require("../model/user.model");
const app_errors_1 = require("../errors/app-errors");
const normalizeEmail = (email) => email.trim().toLowerCase();
exports.userService = {
    async register(input, companyId) {
        //gerando o hash da senha
        const passwordHash = await argon2_1.default.hash(input.password);
        try {
            const user = await user_repository_1.userRepository.create({
                companyId: companyId,
                name: input.name.trim(),
                email: normalizeEmail(input.email),
                passwordHash,
                role: input.role,
            });
            return (0, user_model_1.toPublicUser)(user);
        }
        catch (error) {
            //pegando o erro de conflito se o email já existir
            if (error.code === '235005') {
                throw new app_errors_1.AppError('E-mail já cadastrado', 409);
            }
            throw error;
        }
    },
    async getById(id, companyId) {
        const user = await user_repository_1.userRepository.findById(id, companyId);
        if (!user || !user.active) {
            throw new app_errors_1.AppError('Usuário não encontrado', 404);
        }
        return (0, user_model_1.toPublicUser)(user);
    },
    async list(companyId, limit = 20, offset = 0) {
        const users = await user_repository_1.userRepository.list(companyId, limit, offset);
        return users.map(user_model_1.toPublicUser);
    },
    async desactive(id, companyId) {
        const user = await this.getById(id, companyId);
        await user_repository_1.userRepository.desactive(id, companyId);
    },
};
