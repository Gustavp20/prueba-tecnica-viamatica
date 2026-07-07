# Prueba Node JS - React JS

Repositorio con estructura separada por carpetas:

- Backend
- Frontend

## Tecnologías

- Backend: Node.js, Express, PostgreSQL, JWT, bcrypt, dotenv
- Frontend: React 19, Vite, lucide-react, xlsx

## Requisitos

- Node.js 20+ recomendado
- PostgreSQL configurado y accesible
- Variables de entorno en `Backend/.env`

## Variables de entorno del backend

Configura al menos estas variables:

- `DB_USER`
- `DB_HOST`
- `DB_NAME`
- `DB_PASSWORD`
- `DB_PORT`
- `JWT_SECRET`
- `PORT`

## Levantamiento

### Backend

```bash
cd Backend
npm install
npm run dev
```

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

Si deseas apuntar el frontend a otro backend, define `VITE_API_URL`.

## Funcionalidad implementada

- Login con correo o usuario
- Cierre de sesión
- Registro de sesiones de inicio y cierre
- Bloqueo tras 3 intentos fallidos
- Mantenimiento de usuarios
- Edición de datos propios o de otros usuarios según rol
- Bloqueo de edición de otros administradores
- Cambio de estado solo para administrador
- Carga masiva desde `.xlsx` o `.csv`
- Filtros de búsqueda para administrador
- Interfaz de bienvenida con última sesión
- Dashboard de indicadores para administrador
- Menú cargado desde la base de datos según rol

## Cómo se valida el rol

El frontend no decide quién es administrador. Solo consume la API y muestra lo que el backend autoriza.

La validación real funciona así:

1. El usuario inicia sesión en `POST /api/auth/login`.
2. El backend genera el JWT y guarda `id` y `username`.
3. En cada request protegida, `verifyToken` consulta la base de datos y obtiene el rol actual desde `rol_usuarios` + `rol`.
4. `isAdmin` solo permite continuar si el rol actual es `ADMIN`.
5. El menú se obtiene con `GET /api/menus`, que lee las opciones asignadas al rol desde `rol_rol_opciones` + `rol_opciones`.

## Relación entre tablas

- `persona` guarda los datos personales.
- `usuarios` apunta a `persona` con `Persona_idPersona2`.
- `rol` contiene los roles base como `ADMIN` y `USER`.
- `rol_usuarios` relaciona usuarios con roles.
- `rol_opciones` define las opciones del menú.
- `rol_rol_opciones` relaciona cada rol con sus opciones.
- `sessions` registra los inicios y cierres de sesión por usuario.

## Script para insertar roles

Ejecuta este SQL en PostgreSQL si necesitas dejar creados `ADMIN` y `USER` con sus opciones:

```sql
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
			SELECT 1
			FROM rol_rol_opciones x
			WHERE x.Rol_idRol = r.idRol AND x.RolOpciones_idOpcion = o.idOpcion
	);

INSERT INTO rol_rol_opciones (Rol_idRol, RolOpciones_idOpcion)
SELECT r.idRol, o.idOpcion
FROM rol r
INNER JOIN rol_opciones o ON o.NombreOpcion = 'WELCOME'
WHERE r.RolName = 'USER'
	AND NOT EXISTS (
			SELECT 1
			FROM rol_rol_opciones x
			WHERE x.Rol_idRol = r.idRol AND x.RolOpciones_idOpcion = o.idOpcion
	);

INSERT INTO rol_rol_opciones (Rol_idRol, RolOpciones_idOpcion)
SELECT r.idRol, o.idOpcion
FROM rol r
INNER JOIN rol_opciones o ON o.NombreOpcion = 'MAINTENANCE'
WHERE r.RolName = 'USER'
	AND NOT EXISTS (
			SELECT 1
			FROM rol_rol_opciones x
			WHERE x.Rol_idRol = r.idRol AND x.RolOpciones_idOpcion = o.idOpcion
	);

INSERT INTO rol_rol_opciones (Rol_idRol, RolOpciones_idOpcion)
SELECT r.idRol, o.idOpcion
FROM rol r
INNER JOIN rol_opciones o ON o.NombreOpcion = 'MAINTENANCE'
WHERE r.RolName = 'ADMIN'
	AND NOT EXISTS (
			SELECT 1
			FROM rol_rol_opciones x
			WHERE x.Rol_idRol = r.idRol AND x.RolOpciones_idOpcion = o.idOpcion
	);

INSERT INTO rol_rol_opciones (Rol_idRol, RolOpciones_idOpcion)
SELECT r.idRol, o.idOpcion
FROM rol r
INNER JOIN rol_opciones o ON o.NombreOpcion = 'DASHBOARD_STATS'
WHERE r.RolName = 'ADMIN'
	AND NOT EXISTS (
			SELECT 1
			FROM rol_rol_opciones x
			WHERE x.Rol_idRol = r.idRol AND x.RolOpciones_idOpcion = o.idOpcion
	);
```

Si prefieres ejecutarlo desde archivo, usa [Backend/scripts/seed_roles.sql](Backend/scripts/seed_roles.sql).

## Cómo asignar rol a usuarios existentes

Si `rol_usuarios` está vacía, el sistema no puede distinguir administradores reales. En ese caso:

1. Ejecuta primero la semilla de roles y opciones.
2. Asigna `USER` a todas las cuentas existentes.
3. Asigna `ADMIN` solo al usuario administrador que corresponda.

Ejemplo rápido:

```sql
-- Dar rol USER a todos los usuarios sin rol
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

-- Dar rol ADMIN a un usuario específico por UserName
INSERT INTO rol_usuarios (Rol_idRol, usuarios_idUsuario)
SELECT r.idRol, u.idUsuario
FROM usuarios u
INNER JOIN rol r ON r.RolName = 'ADMIN'
WHERE u.UserName = 'admin'
	AND NOT EXISTS (
			SELECT 1
			FROM rol_usuarios ru
			WHERE ru.usuarios_idUsuario = u.idUsuario AND ru.Rol_idRol = r.idRol
	);
```

## Endpoints principales

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/users/me`
- `GET /api/users/me/summary`
- `GET /api/users`
- `PUT /api/users/:id`
- `POST /api/users/import`
- `GET /api/menus`
- `GET /api/dashboard/stats`

## Migraciones

La migración del backend crea las tablas base y también inserta opciones de menú mínimas para `ADMIN` y `USER`.

Ejecuta la migración si necesitas recrear la estructura:

```bash
cd Backend
node src/infrastructure/database/migrate.js
```

## Notas

- La interfaz de mantenimiento consume datos reales del backend.
- La carga masiva valida filas con campos mínimos antes de enviarlas al servidor.
- El correo se genera automáticamente y agrega un número si hay duplicado.
