import argon2 from 'argon2';
import { companyRepository } from '../repository/company.repository';
import { CreateCompanyBody } from '../schema/company.schema';
import { AppError } from '../errors/app-errors';

export const companyService = {
    async register(input: CreateCompanyBody) {
        const passwordHash = await argon2.hash(input.password);


        try {
            const {company, admin} = await companyRepository.createWithAdmin({
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
        } catch(err) {
            const e = err as {code?: string, constraint?: string};

            if(e.code === '23505') {
                if(e.constraint === 'companies_cnpj_key') {
                    throw new AppError('CNPJ já cadastrado', 409);
                }

                if(e.constraint === 'users_email_key') {
                    throw new AppError('E-mail já cadastrado', 409);
                }
            }
            throw err;
        }
    },

    async updateName(id: string, name: string) {
        const company = await companyRepository.updateName(id, name);

        if(!company) {
            throw new AppError('Empresa não localizada', 404);
        }

        return company;
    },

    async deactivate(id: string) {
        await companyRepository.deactivate(id);
    },

    async findById(id: string) {
        const company = await companyRepository.findById(id);

        if(!company) {
            throw new AppError('Empresa não localizada', 404);
        }

        return company;
    }
};