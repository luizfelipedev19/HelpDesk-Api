"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = errorMiddleware;
const zod_1 = require("zod");
const app_errors_1 = require("../errors/app-errors");
//assinatura do método
function errorMiddleware(err, _req, res, _next) {
    //validação de erros do Zod
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({
            message: 'Dados inválidos',
            errors: err.issues.map((i) => ({
                field: i.path.join('.'),
                message: i.message,
            })),
        });
    }
    if (err instanceof app_errors_1.AppError) {
        return res.status(err.statusCode).json({ message: err.message });
    }
    console.error(err);
    res.status(500).json({ message: 'Erro interno' });
}
