export type UserRole =  'atendente' | 'gestor' | 'admin';

//definindo como o contrato deve ser
export interface User {
    id: string;
    companyId: string;
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    active: boolean;
    createdAt: Date;
    updatedAt: Date | null;
}
//O que será exposto na API com excessão da senha
export type PublicUser = Omit<User, 'passwordHash'>;

//o que é necessário para criar um usuário
export interface CreateUserInput {
    companyId: string;
    name: string;
    email: string;
    passwordHash: string; //o hash é gerado no service
    role: UserRole;
}
//como as linhas vem do banco 
export interface UserRow{
    id_user: string;
    company_id: string;
    name: string;
    email: string;
    password_hash: string;
    role: UserRole;
    active: boolean;
    created_at: Date;
    updated_at: Date | null;
}

//convertendo a linha que vem do banco para a interface de Usuário
export function rowToUser(row: UserRow): User {
    return {
        id: row.id_user,
        companyId: row.company_id,
        name: row.name,
        email: row.email,
        passwordHash: row.password_hash,
        role: row.role,
        active: row.active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function toPublicUser(user: User): PublicUser {
    const {passwordHash, ...publicUser } = user;
    return publicUser;
}