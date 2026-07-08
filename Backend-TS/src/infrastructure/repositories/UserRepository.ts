import { pool } from '../database/postgres';

export class UserRepository {
    async findByEmail(email: string): Promise<any> {
        const query = 'SELECT * FROM usuarios WHERE Mail = $1 AND deleted_at IS NULL';
        const result = await pool.query(query, [email]);
        return result.rows[0];
    }

    async findByUsername(username: string): Promise<any> {
        const query = 'SELECT * FROM usuarios WHERE UserName = $1 AND deleted_at IS NULL';
        const result = await pool.query(query, [username]);
        return result.rows[0];
    }

    async findRoleByUserId(userId: number): Promise<string> {
        const query = `
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
        const result = await pool.query(query, [userId]);
        return result.rows[0]?.role || 'USER';
    }

    async getRoleIdByName(roleName: string): Promise<number | null> {
        const query = 'SELECT idRol FROM Rol WHERE RolName = $1 AND deleted_at IS NULL LIMIT 1';
        const result = await pool.query(query, [roleName]);
        return result.rows[0]?.idrol || null;
    }

    async assignRoleToUser(userId: number, roleName: string = 'USER'): Promise<void> {
        const roleId = await this.getRoleIdByName(roleName);
        if (!roleId) {
            throw new Error(`No existe el rol ${roleName}. Ejecuta primero la semilla de roles.`);
        }
        const query = `
            INSERT INTO rol_usuarios (Rol_idRol, usuarios_idUsuario)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
            RETURNING *;
        `;
        await pool.query(query, [roleId, userId]);
    }

    async syncUserRole(userId: number, roleName: string): Promise<void> {
        const roleId = await this.getRoleIdByName(roleName);
        if (!roleId) {
            throw new Error(`No existe el rol ${roleName}. Ejecuta primero la semilla de roles.`);
        }
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM rol_usuarios WHERE usuarios_idUsuario = $1', [userId]);
            await client.query(
                'INSERT INTO rol_usuarios (Rol_idRol, usuarios_idUsuario) VALUES ($1, $2)',
                [roleId, userId]
            );
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async findMenuByUserId(userId: number): Promise<any[]> {
        const query = `
            SELECT DISTINCT
                o.NombreOpcion AS option,
                CASE o.NombreOpcion
                    WHEN 'WELCOME' THEN 'Bienvenida'
                    WHEN 'MAINTENANCE' THEN 'Mantenimiento'
                    WHEN 'DASHBOARD_STATS' THEN 'Dashboard'
                    ELSE o.NombreOpcion
                END AS label
            FROM rol_usuarios ru
            INNER JOIN Rol r ON r.idRol = ru.Rol_idRol AND r.deleted_at IS NULL
            INNER JOIN rol_rol_Opciones rro ON rro.Rol_idRol = r.idRol
            INNER JOIN Rol_Opciones o ON o.idOpcion = rro.RolOpciones_idOpcion
            WHERE ru.usuarios_idUsuario = $1
            ORDER BY label ASC
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    }

    async findLatestSessionByUserId(userId: number): Promise<any> {
        const query = `
            SELECT idSession AS id,
                   FechaIngreso AS "startedAt",
                   FechaCierre AS "endedAt"
            FROM Sessions
            WHERE usuarios_idUsuario = $1
            ORDER BY FechaIngreso DESC
            LIMIT 1
        `;
        const result = await pool.query(query, [userId]);
        return result.rows[0] || null;
    }

    async findLastFailedAttemptsByUserId(userId: number): Promise<any> {
        const query = `
            SELECT intentos_fallidos AS "intentosFallidos"
            FROM usuarios
            WHERE idUsuario = $1 AND deleted_at IS NULL
            LIMIT 1
        `;
        const result = await pool.query(query, [userId]);
        return result.rows[0] || { intentosFallidos: 0 };
    }

    async findPersonaByIdentification(identificacion: string): Promise<any> {
        const query = 'SELECT * FROM Persona WHERE Identificacion = $1 AND deleted_at IS NULL';
        const result = await pool.query(query, [identificacion]);
        return result.rows[0];
    }

    async findDetailedById(id: number): Promise<any> {
        const query = `
            SELECT
                u.idUsuario AS id,
                u.UserName AS "userName",
                u.Password AS password,
                u.Mail AS email,
                u.SessionActive AS "sessionActive",
                u.Status AS status,
                u.intentos_fallidos AS "intentosFallidos",
                u.Persona_idPersona2 AS "personaId",
                p.Nombres AS nombres,
                p.Apellidos AS apellidos,
                p.Identificacion AS identificacion,
                p.FechaNacimiento AS "fechaNacimiento",
                COALESCE(ARRAY_AGG(DISTINCT r.RolName) FILTER (WHERE r.RolName IS NOT NULL), ARRAY['USER']) AS roles
            FROM usuarios u
            INNER JOIN Persona p ON p.idPersona = u.Persona_idPersona2 AND p.deleted_at IS NULL
            LEFT JOIN rol_usuarios ru ON ru.usuarios_idUsuario = u.idUsuario
            LEFT JOIN Rol r ON r.idRol = ru.Rol_idRol AND r.deleted_at IS NULL
            WHERE u.idUsuario = $1 AND u.deleted_at IS NULL
            GROUP BY u.idUsuario, p.idPersona
            LIMIT 1
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    async findDetailedByIdentificationOrUserName(identificacion: string, userName: string, mail: string): Promise<any> {
        const query = `
            SELECT
                u.idUsuario AS id,
                u.UserName AS "userName",
                u.Mail AS email,
                u.Persona_idPersona2 AS "personaId",
                p.Nombres AS nombres,
                p.Apellidos AS apellidos,
                p.Identificacion AS identificacion,
                p.FechaNacimiento AS "fechaNacimiento",
                COALESCE(ARRAY_AGG(DISTINCT r.RolName) FILTER (WHERE r.RolName IS NOT NULL), ARRAY['USER']) AS roles
            FROM usuarios u
            INNER JOIN Persona p ON p.idPersona = u.Persona_idPersona2 AND p.deleted_at IS NULL
            LEFT JOIN rol_usuarios ru ON ru.usuarios_idUsuario = u.idUsuario
            LEFT JOIN Rol r ON r.idRol = ru.Rol_idRol AND r.deleted_at IS NULL
            WHERE u.deleted_at IS NULL
              AND (
                p.Identificacion = $1
                OR u.UserName = $2
                OR u.Mail = $3
              )
            GROUP BY u.idUsuario, p.idPersona
            LIMIT 1
        `;
        const result = await pool.query(query, [identificacion, userName, mail]);
        return result.rows[0];
    }

    async findAllDetailed(filters: any = {}): Promise<any[]> {
        const whereClauses = ['u.deleted_at IS NULL', 'p.deleted_at IS NULL'];
        const values: any[] = [];

        if (filters.search) {
            values.push(`%${filters.search}%`);
            const index = values.length;
            whereClauses.push(`(
                u.UserName ILIKE $${index}
                OR u.Mail ILIKE $${index}
                OR p.Nombres ILIKE $${index}
                OR p.Apellidos ILIKE $${index}
                OR p.Identificacion ILIKE $${index}
            )`);
        }
        if (filters.status) {
            values.push(filters.status);
            whereClauses.push(`u.Status = $${values.length}`);
        }
        if (filters.role) {
            values.push(filters.role);
            whereClauses.push(`EXISTS (
                SELECT 1
                FROM rol_usuarios ru2
                INNER JOIN Rol r2 ON r2.idRol = ru2.Rol_idRol AND r2.deleted_at IS NULL
                WHERE ru2.usuarios_idUsuario = u.idUsuario
                  AND r2.RolName = $${values.length}
            )`);
        }

        const query = `
            SELECT
                u.idUsuario AS id,
                u.UserName AS "userName",
                u.Mail AS email,
                u.SessionActive AS "sessionActive",
                u.Status AS status,
                u.intentos_fallidos AS "intentosFallidos",
                u.Persona_idPersona2 AS "personaId",
                p.Nombres AS nombres,
                p.Apellidos AS apellidos,
                p.Identificacion AS identificacion,
                p.FechaNacimiento AS "fechaNacimiento",
                COALESCE(ARRAY_AGG(DISTINCT r.RolName) FILTER (WHERE r.RolName IS NOT NULL), ARRAY['USER']) AS roles
            FROM usuarios u
            INNER JOIN Persona p ON p.idPersona = u.Persona_idPersona2 AND p.deleted_at IS NULL
            LEFT JOIN rol_usuarios ru ON ru.usuarios_idUsuario = u.idUsuario
            LEFT JOIN Rol r ON r.idRol = ru.Rol_idRol AND r.deleted_at IS NULL
            WHERE ${whereClauses.join(' AND ')}
            GROUP BY u.idUsuario, p.idPersona
            ORDER BY p.Nombres ASC, p.Apellidos ASC, u.UserName ASC
        `;
        const result = await pool.query(query, values);
        return result.rows;
    }

    async createPersona(personaData: any): Promise<any> {
        const query = `
            INSERT INTO Persona (Nombres, Apellidos, Identificacion, FechaNacimiento)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const values = [
            personaData.nombres,
            personaData.apellidos,
            personaData.identificacion,
            personaData.fechaNacimiento || null
        ];
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    async findAll(): Promise<any[]> {
        const query = 'SELECT * FROM usuarios WHERE deleted_at IS NULL';
        const result = await pool.query(query);
        return result.rows;
    }

    async findById(id: number): Promise<any> {
        const query = 'SELECT * FROM usuarios WHERE idUsuario = $1 AND deleted_at IS NULL';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    async create(userData: any): Promise<any> {
        const { userName, password, mail, personaId, status, sessionActive, intentosFallidos } = userData;
        const query = `
            INSERT INTO usuarios (UserName, Password, Mail, SessionActive, Status, intentos_fallidos, Persona_idPersona2)
            VALUES ($1, $2, $3, COALESCE($4, '0'), COALESCE($5, 'ACTIVO'), COALESCE($6, 0), $7)
            RETURNING *;
        `;
        const values = [
            userName,
            password,
            mail,
            sessionActive ?? null,
            status ?? null,
            intentosFallidos ?? null,
            personaId
        ];
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    async update(id: number, updateData: any): Promise<any> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const userResult = await client.query(
                'SELECT Persona_idPersona2 FROM usuarios WHERE idUsuario = $1 AND deleted_at IS NULL FOR UPDATE',
                [id]
            );
            if (!userResult.rows[0]) {
                throw new Error('Usuario no encontrado.');
            }

            const personaId = userResult.rows[0].persona_idpersona2;

            const personaFieldsTouched =
                updateData.nombres !== undefined ||
                updateData.apellidos !== undefined ||
                updateData.identificacion !== undefined ||
                updateData.fechaNacimiento !== undefined;

            if (personaFieldsTouched) {
                await client.query(
                    `
                        UPDATE Persona
                        SET
                            Nombres = COALESCE($1, Nombres),
                            Apellidos = COALESCE($2, Apellidos),
                            Identificacion = COALESCE($3, Identificacion),
                            FechaNacimiento = COALESCE($4, FechaNacimiento)
                        WHERE idPersona = $5 AND deleted_at IS NULL
                    `,
                    [
                        updateData.nombres !== undefined ? updateData.nombres : null,
                        updateData.apellidos !== undefined ? updateData.apellidos : null,
                        updateData.identificacion !== undefined ? updateData.identificacion : null,
                        updateData.fechaNacimiento !== undefined ? updateData.fechaNacimiento : null,
                        personaId
                    ]
                );
            }

            const userFieldsTouched =
                updateData.userName !== undefined ||
                updateData.mail !== undefined ||
                updateData.password !== undefined ||
                updateData.sessionActive !== undefined ||
                updateData.status !== undefined ||
                updateData.intentosFallidos !== undefined;

            if (userFieldsTouched) {
                await client.query(
                    `
                        UPDATE usuarios
                        SET
                            UserName = COALESCE($1, UserName),
                            Mail = COALESCE($2, Mail),
                            Password = COALESCE($3, Password),
                            SessionActive = COALESCE($4, SessionActive),
                            Status = COALESCE($5, Status),
                            intentos_fallidos = COALESCE($6, intentos_fallidos)
                        WHERE idUsuario = $7 AND deleted_at IS NULL
                    `,
                    [
                        updateData.userName !== undefined ? updateData.userName : null,
                        updateData.mail !== undefined ? updateData.mail : null,
                        updateData.password !== undefined ? updateData.password : null,
                        updateData.sessionActive !== undefined ? updateData.sessionActive : null,
                        updateData.status !== undefined ? updateData.status : null,
                        updateData.intentosFallidos !== undefined ? updateData.intentosFallidos : null,
                        id
                    ]
                );
            }

            await client.query('COMMIT');
            return await this.findDetailedById(id);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async delete(id: number): Promise<any> {
        const query = `
            UPDATE usuarios
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE idUsuario = $1 AND deleted_at IS NULL
            RETURNING *;
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    async findByPersonaId(personaId: number): Promise<any> {
        const query = 'SELECT * FROM usuarios WHERE Persona_idPersona2 = $1 AND deleted_at IS NULL';
        const result = await pool.query(query, [personaId]);
        return result.rows[0];
    }

    async registerFailedAttempt(userId: number): Promise<void> {
        const query = 'SELECT registrar_intento_fallido($1)';
        await pool.query(query, [userId]);
    }
}