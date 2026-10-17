import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';   

//pegando as config que estao no .env
dotenv.config();


//abrinco conexão com o banco de dados
export const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USUARIO,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

//helper de transação
export async function withTransaction<T>(fn: (client: PoolClient) => Promise <T>): Promise<T> {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const result = await fn(client);

        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally{
        client.release();
    }
}