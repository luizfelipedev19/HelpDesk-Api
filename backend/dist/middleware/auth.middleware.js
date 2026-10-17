"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.authorize = authorize;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const app_errors_1 = require("../errors/app-errors");
const tokenPayloadSchema = zod_1.z.object({
    sub: zod_1.z.string().uuid(),
    role: zod_1.z.enum(['atendente', 'gestor', 'admin']),
    companyId: zod_1.z.string().uuid(),
});
function authenticate(req, _res, next) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET não configurado');
    }
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        throw new app_errors_1.AppError('Não autenticado', 401);
    }
    const token = header.slice('Bearer '.length).trim();
    try {
        const decoded = jsonwebtoken_1.default.verify(token, secret, { algorithms: ['HS256'] });
        const payload = tokenPayloadSchema.parse(decoded);
        req.user = { id: payload.sub, role: payload.role, companyId: payload.companyId };
        next();
    }
    catch {
        throw new app_errors_1.AppError('Não autenticado', 401);
    }
}
function authorize(...roles) {
    return (req, _res, next) => {
        if (!req.user) {
            throw new app_errors_1.AppError('Não autenticado', 401);
        }
        if (!roles.includes(req.user.role)) {
            throw new app_errors_1.AppError('Acesso negado', 403);
        }
        next();
    };
}
