"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.verifyToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const postgres_1 = require("../database/postgres");
const verifyToken = async (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(403).json({ message: 'No se proporcionó un token.' });
    }
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : authorization;
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || '');
        req.user = decoded;
        const roleQuery = `
            SELECT CASE
                WHEN EXISTS (
                    SELECT 1
                    FROM rol_usuarios ru
                    INNER JOIN Rol r ON r.idRol = ru.Rol_idRol AND r.deleted_at IS NULL
                    WHERE ru.usuarios_idUsuario = $1
                      AND r.RolName = 'ADMIN'
                ) THEN 'ADMIN'
                ELSE 'USER'
            END AS role
        `;
        const result = await postgres_1.pool.query(roleQuery, [decoded.id]);
        req.user.role = result.rows[0]?.role || decoded.role || 'USER';
        return next();
    }
    catch (error) {
        return res.status(401).json({ message: 'Token inválido o expirado.' });
    }
};
exports.verifyToken = verifyToken;
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Acceso denegado. Requiere rol de Administrador.' });
    }
    return next();
};
exports.isAdmin = isAdmin;
