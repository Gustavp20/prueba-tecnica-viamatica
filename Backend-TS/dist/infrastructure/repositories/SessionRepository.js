"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionRepository = void 0;
const postgres_1 = require("../database/postgres");
class SessionRepository {
    async createSession(userId) {
        const query = 'INSERT INTO Sessions (usuarios_idUsuario, FechaIngreso) VALUES ($1, CURRENT_TIMESTAMP) RETURNING *;';
        const result = await postgres_1.pool.query(query, [userId]);
        return result.rows[0];
    }
    async closeSession(userId) {
        const query = `
            UPDATE Sessions 
            SET FechaCierre = CURRENT_TIMESTAMP 
            WHERE usuarios_idUsuario = $1 AND FechaCierre IS NULL 
            RETURNING *;
        `;
        const result = await postgres_1.pool.query(query, [userId]);
        return result.rows[0];
    }
}
exports.SessionRepository = SessionRepository;
