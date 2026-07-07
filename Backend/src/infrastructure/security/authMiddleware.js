const jwt = require('jsonwebtoken');
const { pool } = require('../database/postgres');

const verifyToken = async (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: "No se proporcionó un token." });

    try {
        const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
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
        next();
    } catch (error) {
        return res.status(401).json({ message: "Token inválido o expirado." });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Acceso denegado. Requiere rol de Administrador." });
    }
    next();
};

module.exports = { verifyToken, isAdmin };