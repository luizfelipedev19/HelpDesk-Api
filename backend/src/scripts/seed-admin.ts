import argon2 from 'argon2';
import { pool } from '../config/db.config';
import { companyRepository } from '../repository/company.repository';
import { userRepository } from '../repository/user.repository';
import { createCompanySchema } from '../schema/company.schema';

// Cria uma empresa + admin inicial a partir de variáveis SEED_*. Idempotente: se o e-mail já existe, não faz nada.
// Útil em dev/primeiro deploy; em produção o cadastro normal é POST /companies.
async function seed() {
    const input = createCompanySchema.parse({
        companyName: process.env.SEED_COMPANY_NAME,
        cnpj: process.env.SEED_COMPANY_CNPJ,
        responsibleName: process.env.SEED_ADMIN_NAME,
        email: process.env.SEED_ADMIN_EMAIL,
        password: process.env.SEED_ADMIN_PASSWORD,
    });

    if (await userRepository.findByEmail(input.email)) {
        console.log(`Admin ${input.email} já existe, nada a fazer.`);
        return;
    }

    await companyRepository.createWithAdmin({
        companyName: input.companyName,
        cnpj: input.cnpj,
        adminName: input.responsibleName,
        adminEmail: input.email,
        passwordHash: await argon2.hash(input.password),
    });

    console.log(`✔ Empresa "${input.companyName}" e admin ${input.email} criados.`);
}

seed()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
