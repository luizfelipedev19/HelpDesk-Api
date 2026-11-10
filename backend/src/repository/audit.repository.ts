import { Pool, PoolClient } from "pg";
import { pool } from "../config/db.config";

export interface AuditEntry {
    id: string;
    actorId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    details: unknown;
    createdAt: Date;
}

export interface CreateAuditInput {
    companyId: string;
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    details?: unknown;
}

interface AuditRow {
    id_audit: string;
    actor_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string;
    details: unknown;
    created_at: Date;
}

export const auditRepository = {
    async create(input: CreateAuditInput, db: Pool | PoolClient = pool): Promise<void> {
        await db.query(
            `insert into audit_log (company_id, actor_id, action, entity_type, entity_id, details)
            values ($1, $2, $3, $4, $5, $6)`,
            [input.companyId, input.actorId, input.action, input.entityType, input.entityId, input.details ?? null],
        );
    },

    async list(companyId: string, limit: number, offset: number): Promise<AuditEntry[]> {
        const {rows} = await pool.query<AuditRow>(
            `select id_audit, actor_id, action, entity_type, entity_id, details, created_at
            from audit_log where company_id = $1
            order by created_at desc limit $2 offset $3`,
            [companyId, limit, offset],
        );

        return rows.map((r) => ({
            id: r.id_audit,
            actorId: r.actor_id,
            action: r.action,
            entityType: r.entity_type,
            entityId: r.entity_id,
            details: r.details,
            createdAt: r.created_at,
        }));
    },
};
