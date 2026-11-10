import { NextFunction, Request, Response } from "express";
import jwt from 'jsonwebtoken';
import {z} from 'zod';
import { AppError } from "../errors/app-errors";
import { UserRole } from "../model/user.model";
import { userRepository } from "../repository/user.repository";

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

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
    const secret = process.env.JWT_SECRET;

    if(!secret){
        throw new Error('JWT_SECRET não configurado');
    }
    const header = req.headers.authorization;
    if(!header?.startsWith('Bearer ')){
        throw new AppError('Não autenticado', 401);
    }

    const token = header.slice('Bearer '.length).trim();


    let payload: z.infer<typeof tokenPayloadSchema>;
    try {
        payload = tokenPayloadSchema.parse(jwt.verify(token, secret, {algorithms: ['HS256']}));
    } catch {
        throw new AppError('Não autenticado', 401);
    }

    // O token sozinho não revoga nada: confere no banco para que desativar usuário/empresa
    // ou mudar o papel valha na hora, não só no próximo login.
    const state = await userRepository.findAuthState(payload.sub, payload.companyId);
    if(!state?.active) {
        throw new AppError('Não autenticado', 401);
    }

    req.user = {id: payload.sub, role: state.role, companyId: payload.companyId};
    next();
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

