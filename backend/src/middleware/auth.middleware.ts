import { NextFunction, Request, Response } from "express";
import jwt from 'jsonwebtoken';
import {z} from 'zod';
import { AppError } from "../errors/app-errors";
import { UserRole } from "../model/user.model";

export interface AuthUser {
    id: string;
    role: UserRole;
    companyId: string;
}


//Diz ao typescript que o Request do express pode ter "user"
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}


const tokenPayloadSchema = z.object ({
    sub: z.string().uuid(),
    role: z.enum(['atendente', 'gestor', 'admin']),
    companyId: z.string().uuid(),
});

export function authenticate(req: Request, _res: Response, next: NextFunction) {
    const secret = process.env.JWT_SECRET;

    if(!secret){
        throw new Error('JWT_SECRET não configurado');
    }
    const header = req.headers.authorization;
    if(!header?.startsWith('Bearer ')){
        throw new AppError('Não autenticado', 401);
    }

    const token = header.slice('Bearer '.length).trim();


    try {
        const decoded = jwt.verify(token, secret, {algorithms: ['HS256']});

        const payload = tokenPayloadSchema.parse(decoded);
        req.user = {id: payload.sub, role: payload.role as UserRole, companyId: payload.companyId};
        next();
    } catch {
        throw new AppError('Não autenticado', 401);
    }
}

export function authorize(...roles: UserRole[]){
    return(req: Request, _res: Response, next: NextFunction) => {
        if(!req.user) {
            throw new AppError('Não autenticado', 401);
        }

        if(!roles.includes(req.user.role)) {
            throw new AppError('Acesso negado', 403);
        }

        next();
    }
}

