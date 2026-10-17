"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const db_config_1 = require("../config/db.config");
const migrationsDir = node_path_1.default.resolve(process.cwd(), 'migrations');
const LOCK_ID = 727274; // evita duas execuções simultâneas
async function migrate() {
    const client = await db_config_1.pool.connect();
    try {
        await client.query('select pg_advisory_lock($1)', [LOCK_ID]);
        await client.query(`
      create table if not exists schema_migrations (
        name       text primary key,
        applied_at timestamptz not null default now()
      )
    `);
        const { rows } = await client.query('select name from schema_migrations');
        const applied = new Set(rows.map((r) => r.name));
        const files = node_fs_1.default
            .readdirSync(migrationsDir)
            .filter((f) => f.endsWith('.sql'))
            .sort();
        let count = 0;
        for (const file of files) {
            if (applied.has(file))
                continue;
            const sql = node_fs_1.default.readFileSync(node_path_1.default.join(migrationsDir, file), 'utf8');
            try {
                await client.query('begin');
                await client.query(sql);
                await client.query('insert into schema_migrations (name) values ($1)', [file]);
                await client.query('commit');
                console.log(`✔ aplicada: ${file}`);
                count++;
            }
            catch (err) {
                await client.query('rollback');
                console.error(`✘ falhou: ${file}`);
                throw err;
            }
        }
        console.log(count === 0 ? 'Banco já está atualizado.' : `${count} migration(s) aplicada(s).`);
    }
    finally {
        await client.query('select pg_advisory_unlock($1)', [LOCK_ID]).catch(() => { });
        client.release();
        await db_config_1.pool.end();
    }
}
migrate().catch((err) => {
    console.error(err);
    process.exit(1);
});
