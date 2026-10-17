import argon2 from 'argon2';
import { userRepository } from '../repository/user.repository';
import { PublicUser, UserRole, toPublicUser} from '../model/user.model';
import { AppError } from '../errors/app-errors';
import { CreateUserBody } from '../schema/user.schema';

export interface RegisterUserInput{
    name: string;
    email: string;
    password: string;
    role: UserRole;
}


const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const userService = {
    async register(input: CreateUserBody, companyId: string): Promise<PublicUser> {
        //gerando o hash da senha
        const passwordHash = await argon2.hash(input.password);


        try {
            const user = await userRepository.create({
                companyId: companyId,
                name: input.name.trim(),
                email: normalizeEmail(input.email),
                passwordHash,
                role: input.role,
            });

            return toPublicUser(user);
        } catch(error){
            //pegando o erro de conflito se o email já existir
            if((error as {code?: string}).code === '235005'){
                throw new AppError('E-mail já cadastrado', 409);
            }
            throw error;
        }
    },

    async getById(id: string, companyId: string): Promise<PublicUser> {
        const user = await userRepository.findById(id, companyId);
        if(!user || !user.active){
            throw new AppError('Usuário não encontrado', 404);
        }

        return toPublicUser(user);
    },

    async list(companyId: string, limit = 20, offset = 0): Promise<PublicUser[]> {
        const users = await userRepository.list(companyId, limit, offset);
        return users.map(toPublicUser);
    },


    async desactive(id: string, companyId: string): Promise<void> {
        const user = await this.getById(id, companyId);
        await userRepository.desactive(id, companyId);
    },
};