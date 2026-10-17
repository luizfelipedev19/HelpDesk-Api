import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repository/user.repository';
import { UserRole } from '../model/user.model';
import { AppError } from '../errors/app-errors';

export interface TokenPayload{
    sub: string;
    role: UserRole;
    companyId: string;
}

const invalidCredentials = () => new AppError ('Credenciais inválidas', 401);

export const authService = {

    /**
     * 
     * @param email 
     * @param password 
     * @param allowdRoles 
     * @returns 
     * 
     * função que vai fazer a verificação de secret, acesso e no final retornar o token
     */
    async login(email: string, password: string, allowdRoles: UserRole[]) {
        const secret = process.env.JWT_SECRET;
        if(!secret) throw new Error('JWT_SECRET não configurado');

        //busca o usuário
        const user = await userRepository.findByEmail(email);
        console.log('User found:', user); // Debugging line

        //Usuário inexistente

        if(!user){
            await argon2.hash(password);
            throw invalidCredentials();
        }

        const passwordOk = await argon2.verify(user.passwordHash, password);

        

        if(!passwordOk || !user.active || !allowdRoles.includes(user.role)) {
            throw invalidCredentials();
        }

        const payload: TokenPayload = {sub: user.id, role: user.role, companyId: user.companyId};
        const token = jwt.sign(payload, secret, {algorithm: 'HS256', expiresIn: '8h'});


        return {token};
    }
}