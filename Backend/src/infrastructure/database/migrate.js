const { pool } = require('./postgres');

const runMigrations = async () => {
    const ddlQuery = `
        CREATE TABLE IF NOT EXISTS Persona (
            idPersona SERIAL PRIMARY KEY,
            Nombres VARCHAR(60) NOT NULL,
            Apellidos VARCHAR(60) NOT NULL,
            Identificacion VARCHAR(10) UNIQUE NOT NULL,
            FechaNacimiento DATE,
            deleted_at TIMESTAMP NULL
        );

        CREATE TABLE IF NOT EXISTS usuarios (
            idUsuario SERIAL PRIMARY KEY,
            UserName VARCHAR(50) UNIQUE NOT NULL,
            Password VARCHAR(255) NOT NULL,
            Mail VARCHAR(120) UNIQUE NOT NULL,
            SessionActive CHAR(1) DEFAULT '0',
            Status VARCHAR(20) DEFAULT 'ACTIVO',
            intentos_fallidos INT DEFAULT 0,
            Persona_idPersona2 INT NOT NULL,
            deleted_at TIMESTAMP NULL,
            CONSTRAINT fk_persona FOREIGN KEY (Persona_idPersona2) REFERENCES Persona(idPersona)
        );

        CREATE TABLE IF NOT EXISTS Rol (
            idRol SERIAL PRIMARY KEY,
            RolName VARCHAR(50) NOT NULL,
            deleted_at TIMESTAMP NULL
        );

        CREATE TABLE IF NOT EXISTS rol_usuarios (
            Rol_idRol INT NOT NULL,
            usuarios_idUsuario INT NOT NULL,
            PRIMARY KEY (Rol_idRol, usuarios_idUsuario),
            CONSTRAINT fk_rol FOREIGN KEY (Rol_idRol) REFERENCES Rol(idRol),
            CONSTRAINT fk_usuario FOREIGN KEY (usuarios_idUsuario) REFERENCES usuarios(idUsuario)
        );

        CREATE TABLE IF NOT EXISTS Rol_Opciones (
            idOpcion SERIAL PRIMARY KEY,
            NombreOpcion VARCHAR(50) NOT NULL
        );

        CREATE TABLE IF NOT EXISTS rol_rol_Opciones (
            Rol_idRol INT NOT NULL,
            RolOpciones_idOpcion INT NOT NULL,
            PRIMARY KEY (Rol_idRol, RolOpciones_idOpcion),
            CONSTRAINT fk_rol_opcion FOREIGN KEY (Rol_idRol) REFERENCES Rol(idRol),
            CONSTRAINT fk_opcion FOREIGN KEY (RolOpciones_idOpcion) REFERENCES Rol_Opciones(idOpcion)
        );

        CREATE TABLE IF NOT EXISTS Sessions (
            idSession SERIAL PRIMARY KEY,
            FechaIngreso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FechaCierre TIMESTAMP NULL,
            usuarios_idUsuario INT NOT NULL,
            CONSTRAINT fk_session_usuario FOREIGN KEY (usuarios_idUsuario) REFERENCES usuarios(idUsuario)
        );

        CREATE OR REPLACE FUNCTION registrar_intento_fallido(p_usuario_id INT)
        RETURNS VOID AS $$
        DECLARE
            v_intentos INT;
        BEGIN
            UPDATE usuarios 
            SET intentos_fallidos = intentos_fallidos + 1 
            WHERE idUsuario = p_usuario_id
            RETURNING intentos_fallidos INTO v_intentos;

            IF v_intentos >= 3 THEN
                UPDATE usuarios 
                SET Status = 'BLOQUEADO' 
                WHERE idUsuario = p_usuario_id;
            END IF;
        END;
        $$ LANGUAGE plpgsql;

                INSERT INTO Rol (RolName)
                SELECT 'ADMIN'
                WHERE NOT EXISTS (SELECT 1 FROM Rol WHERE RolName = 'ADMIN');

                INSERT INTO Rol (RolName)
                SELECT 'USER'
                WHERE NOT EXISTS (SELECT 1 FROM Rol WHERE RolName = 'USER');

                INSERT INTO Rol_Opciones (NombreOpcion)
                SELECT 'WELCOME'
                WHERE NOT EXISTS (SELECT 1 FROM Rol_Opciones WHERE NombreOpcion = 'WELCOME');

                INSERT INTO Rol_Opciones (NombreOpcion)
                SELECT 'MAINTENANCE'
                WHERE NOT EXISTS (SELECT 1 FROM Rol_Opciones WHERE NombreOpcion = 'MAINTENANCE');

                INSERT INTO Rol_Opciones (NombreOpcion)
                SELECT 'DASHBOARD_STATS'
                WHERE NOT EXISTS (SELECT 1 FROM Rol_Opciones WHERE NombreOpcion = 'DASHBOARD_STATS');

                INSERT INTO rol_rol_Opciones (Rol_idRol, RolOpciones_idOpcion)
                SELECT r.idRol, o.idOpcion
                FROM Rol r
                INNER JOIN Rol_Opciones o ON o.NombreOpcion = 'WELCOME'
                WHERE r.RolName = 'ADMIN'
                    AND NOT EXISTS (
                            SELECT 1 FROM rol_rol_Opciones x
                            WHERE x.Rol_idRol = r.idRol AND x.RolOpciones_idOpcion = o.idOpcion
                    );

                INSERT INTO rol_rol_Opciones (Rol_idRol, RolOpciones_idOpcion)
                SELECT r.idRol, o.idOpcion
                FROM Rol r
                INNER JOIN Rol_Opciones o ON o.NombreOpcion = 'WELCOME'
                WHERE r.RolName = 'USER'
                    AND NOT EXISTS (
                            SELECT 1 FROM rol_rol_Opciones x
                            WHERE x.Rol_idRol = r.idRol AND x.RolOpciones_idOpcion = o.idOpcion
                    );

                INSERT INTO rol_rol_Opciones (Rol_idRol, RolOpciones_idOpcion)
                SELECT r.idRol, o.idOpcion
                FROM Rol r
                INNER JOIN Rol_Opciones o ON o.NombreOpcion = 'MAINTENANCE'
                WHERE r.RolName = 'USER'
                    AND NOT EXISTS (
                            SELECT 1 FROM rol_rol_Opciones x
                            WHERE x.Rol_idRol = r.idRol AND x.RolOpciones_idOpcion = o.idOpcion
                    );

                INSERT INTO rol_rol_Opciones (Rol_idRol, RolOpciones_idOpcion)
                SELECT r.idRol, o.idOpcion
                FROM Rol r
                INNER JOIN Rol_Opciones o ON o.NombreOpcion = 'MAINTENANCE'
                WHERE r.RolName = 'ADMIN'
                    AND NOT EXISTS (
                            SELECT 1 FROM rol_rol_Opciones x
                            WHERE x.Rol_idRol = r.idRol AND x.RolOpciones_idOpcion = o.idOpcion
                    );

                INSERT INTO rol_rol_Opciones (Rol_idRol, RolOpciones_idOpcion)
                SELECT r.idRol, o.idOpcion
                FROM Rol r
                INNER JOIN Rol_Opciones o ON o.NombreOpcion = 'DASHBOARD_STATS'
                WHERE r.RolName = 'ADMIN'
                    AND NOT EXISTS (
                            SELECT 1 FROM rol_rol_Opciones x
                            WHERE x.Rol_idRol = r.idRol AND x.RolOpciones_idOpcion = o.idOpcion
                    );
    `;

    try {
        console.log('Iniciando migración de la base de datos...');
        await pool.query(ddlQuery);
        console.log('¡Migración completada con éxito! Las tablas y la función han sido creadas.');
        process.exit(0);
    } catch (error) {
        console.error(' Error ejecutando la migración:', error);
        process.exit(1);
    }
};

runMigrations();