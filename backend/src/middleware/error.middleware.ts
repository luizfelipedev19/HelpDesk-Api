import {NextFunction, Request, Response} from 'express';
import {ZodError} from 'zod';
import {AppError} from '../errors/app-errors';

//assinatura do método
export function errorMiddleware(
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
) {
    //validação de erros do Zod
    if (err instanceof ZodError) {
        return res.status(400).json({
            message: 'Dados inválidos',
            errors: err.issues.map((i) => ({
                field: i.path.join('.'),
                message: i.message,
            })),
        });
    }

    if(err instanceof AppError){
        return res.status(err.statusCode).json({message: err.message})
    }

    console.error(err);
    res.status(500).json({message: 'Erro interno'});
}