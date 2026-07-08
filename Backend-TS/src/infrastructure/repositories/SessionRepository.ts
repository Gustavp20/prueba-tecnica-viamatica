import { pool } from '../database/postgres';

export class SessionRepository {
    async createSession(userId: number): Promise<any> {
        const query = 'INSERT INTO Sessions (usuarios_idUsuario, FechaIngreso) VALUES ($1, CURRENT_TIMESTAMP) RETURNING *;';
        const result = await pool.query(query, [userId]);
        return result.rows[0];
    }

    async closeSession(userId: number): Promise<any> {
        const query = `
            UPDATE Sessions 
            SET FechaCierre = CURRENT_TIMESTAMP 
            WHERE usuarios_idUsuario = $1 AND FechaCierre IS NULL 
            RETURNING *;
        `;
        const result = await pool.query(query, [userId]);
        return result.rows[0];
    }
}