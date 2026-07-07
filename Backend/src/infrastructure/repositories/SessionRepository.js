const { pool } = require('../database/postgres');

class SessionRepository {
    async createSession(userId) {
        const query = 'INSERT INTO Sessions (usuarios_idUsuario, FechaIngreso) VALUES ($1, CURRENT_TIMESTAMP) RETURNING *;';
        const result = await pool.query(query, [userId]);
        return result.rows[0];
    }

    async closeSession(userId) {
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

module.exports = SessionRepository;