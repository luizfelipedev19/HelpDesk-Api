"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rowToUser = rowToUser;
exports.toPublicUser = toPublicUser;
//convertendo a linha que vem do banco para a interface de Usuário
function rowToUser(row) {
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
function toPublicUser(user) {
    const { passwordHash, ...publicUser } = user;
    return publicUser;
}
