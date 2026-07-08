import dotenv from 'dotenv';
import { Pool, PoolConfig } from 'pg';

dotenv.config();

const poolConfig: PoolConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
};

export const pool = new Pool(poolConfig);

pool.on('error', (error) => {
    console.error('Error inesperado en el cliente de la base de datos', error);
    process.exit(-1);
});

export const query = (text: string, params?: readonly unknown[]) => pool.query(text, params as never[]);

export default pool;