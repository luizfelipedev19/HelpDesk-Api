"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const argon2_1 = __importDefault(require("argon2"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_repository_1 = require("../repository/user.repository");
const app_errors_1 = require("../errors/app-errors");
const invalidCredentials = () => new app_errors_1.AppError('Credenciais inválidas', 401);
exports.authService = {
    /**
     *
     * @param email
     * @param password
     * @param allowdRoles
     * @returns
     *
     * função que vai fazer a verificação de secret, acesso e no final retornar o token
     */
    async login(email, password, allowdRoles) {
        const secret = process.env.JWT_SECRET;
        if (!secret)
            throw new Error('JWT_SECRET não configurado');
        //busca o usuário
        const user = await user_repository_1.userRepository.findByEmail(email);
        console.log('User found:', user); // Debugging line
        //Usuário inexistente
        if (!user) {
            await argon2_1.default.hash(password);
            throw invalidCredentials();
        }
        const passwordOk = await argon2_1.default.verify(user.passwordHash, password);
        if (!passwordOk || !user.active || !allowdRoles.includes(user.role)) {
            throw invalidCredentials();
        }
        const payload = { sub: user.id, role: user.role, companyId: user.companyId };
        const token = jsonwebtoken_1.default.sign(payload, secret, { algorithm: 'HS256', expiresIn: '8h' });
        return { token };
    }
};
