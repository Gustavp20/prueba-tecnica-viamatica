import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { pool } from '../database/postgres';

interface AuthTokenPayload extends JwtPayload {
    id: number;
    username?: string;
    role?: string;
}

export const verifyToken = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const authorization = req.headers.authorization;

    if (!authorization) {
        return res.status(403).json({ message: 'No se proporcionó un token.' });
    }

    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : authorization;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as AuthTokenPayload;
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

        const result = await pool.query(roleQuery, [decoded.id]);
        req.user.role = result.rows[0]?.role || decoded.role || 'USER';

        return next();
    } catch (error) {
        return res.status(401).json({ message: 'Token inválido o expirado.' });
    }
};

export const isAdmin = (req: Request, res: Response, next: NextFunction): any => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Acceso denegado. Requiere rol de Administrador.' });
    }

    return next();
};