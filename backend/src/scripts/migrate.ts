import fs from 'node:fs';
import path from 'node:path';
import { pool } from '../config/db.config';

const migrationsDir = path.resolve(process.cwd(), 'migrations');
const LOCK_ID = 727274; // evita duas execuções simultâneas

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('select pg_advisory_lock($1)', [LOCK_ID]);

    await client.query(`
      create table if not exists schema_migrations (
        name       text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    const { rows } = await client.query<{ name: string }>(
      'select name from schema_migrations',
    );
    const applied = new Set(rows.map((r) => r.name));

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      try {
        await client.query('begin');
        await client.query(sql);
        await client.query('insert into schema_migrations (name) values ($1)', [file]);
        await client.query('commit');
        console.log(`✔ aplicada: ${file}`);
        count++;
      } catch (err) {
        await client.query('rollback');
        console.error(`✘ falhou: ${file}`);
        throw err;
      }
    }

    console.log(count === 0 ? 'Banco já está atualizado.' : `${count} migration(s) aplicada(s).`);
  } finally {
    await client.query('select pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {});
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});