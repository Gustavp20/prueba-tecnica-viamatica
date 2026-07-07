-- Script para poblar roles y asignarlos a usuarios existentes
-- Ejecutar en PostgreSQL con cuidado sobre una base ya creada.

INSERT INTO rol (RolName)
SELECT 'ADMIN'
WHERE NOT EXISTS (SELECT 1 FROM rol WHERE RolName = 'ADMIN');

INSERT INTO rol (RolName)
SELECT 'USER'
WHERE NOT EXISTS (SELECT 1 FROM rol WHERE RolName = 'USER');

INSERT INTO rol_opciones (NombreOpcion)
SELECT 'WELCOME'
WHERE NOT EXISTS (SELECT 1 FROM rol_opciones WHERE NombreOpcion = 'WELCOME');

INSERT INTO rol_opciones (NombreOpcion)
SELECT 'MAINTENANCE'
WHERE NOT EXISTS (SELECT 1 FROM rol_opciones WHERE NombreOpcion = 'MAINTENANCE');

INSERT INTO rol_opciones (NombreOpcion)
SELECT 'DASHBOARD_STATS'
WHERE NOT EXISTS (SELECT 1 FROM rol_opciones WHERE NombreOpcion = 'DASHBOARD_STATS');

INSERT INTO rol_rol_opciones (Rol_idRol, RolOpciones_idOpcion)
SELECT r.idRol, o.idOpcion
FROM rol r
INNER JOIN rol_opciones o ON o.NombreOpcion = 'WELCOME'
WHERE r.RolName = 'ADMIN'
  AND NOT EXISTS (
      SELECT 1 FROM rol_rol_opciones x
      WHERE x.Rol_idRol = r.idRol AND x.RolOpciones_idOpcion = o.idOpcion
  );

INSERT INTO rol_rol_opciones (Rol_idRol, RolOpciones_idOpcion)
SELECT r.idRol, o.idOpcion
FROM rol r
INNER JOIN rol_opciones o ON o.NombreOpcion = 'WELCOME'
WHERE r.RolName = 'USER'
  AND NOT EXISTS (
      SELECT 1 FROM rol_rol_opciones x
      WHERE x.Rol_idRol = r.idRol AND x.RolOpciones_idOpcion = o.idOpcion
  );

INSERT INTO rol_rol_opciones (Rol_idRol, RolOpciones_idOpcion)
SELECT r.idRol, o.idOpcion
FROM rol r
INNER JOIN rol_opciones o ON o.NombreOpcion = 'MAINTENANCE'
WHERE r.RolName = 'ADMIN'
  AND NOT EXISTS (
      SELECT 1 FROM rol_rol_opciones x
      WHERE x.Rol_idRol = r.idRol AND x.RolOpciones_idOpcion = o.idOpcion
  );

INSERT INTO rol_rol_opciones (Rol_idRol, RolOpciones_idOpcion)
SELECT r.idRol, o.idOpcion
FROM rol r
INNER JOIN rol_opciones o ON o.NombreOpcion = 'MAINTENANCE'
WHERE r.RolName = 'USER'
  AND NOT EXISTS (
      SELECT 1 FROM rol_rol_opciones x
      WHERE x.Rol_idRol = r.idRol AND x.RolOpciones_idOpcion = o.idOpcion
  );

INSERT INTO rol_rol_opciones (Rol_idRol, RolOpciones_idOpcion)
SELECT r.idRol, o.idOpcion
FROM rol r
INNER JOIN rol_opciones o ON o.NombreOpcion = 'DASHBOARD_STATS'
WHERE r.RolName = 'ADMIN'
  AND NOT EXISTS (
      SELECT 1 FROM rol_rol_opciones x
      WHERE x.Rol_idRol = r.idRol AND x.RolOpciones_idOpcion = o.idOpcion
  );

-- Asignar USER a usuarios existentes que todavía no tengan rol
INSERT INTO rol_usuarios (Rol_idRol, usuarios_idUsuario)
SELECT r.idRol, u.idUsuario
FROM usuarios u
CROSS JOIN rol r
WHERE r.RolName = 'USER'
  AND u.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM rol_usuarios ru
      WHERE ru.usuarios_idUsuario = u.idUsuario
  );

-- Si existe un usuario específico que debe ser ADMIN, cambie el WHERE por su idUsuario o UserName.
-- Ejemplo:
-- INSERT INTO rol_usuarios (Rol_idRol, usuarios_idUsuario)
-- SELECT r.idRol, u.idUsuario
-- FROM usuarios u
-- INNER JOIN rol r ON r.RolName = 'ADMIN'
-- WHERE u.UserName = 'admin'
--   AND NOT EXISTS (
--       SELECT 1 FROM rol_usuarios ru
--       WHERE ru.usuarios_idUsuario = u.idUsuario AND ru.Rol_idRol = r.idRol
--   );
