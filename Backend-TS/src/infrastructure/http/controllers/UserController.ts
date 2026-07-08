import { Request, Response } from 'express';
import { CreateUserUseCase } from '../../../application/use-cases/CreateUserUseCase';
import { UserRepository } from '../../repositories/UserRepository';
import { EmailGeneratorService } from '../../../domain/services/EmailGeneratorService';
import { UserValidator } from '../../../domain/value-objects/UserValidator';
import { pool } from '../../database/postgres';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const userRepository = new UserRepository();
const emailGeneratorService = new EmailGeneratorService(userRepository);
const createUserUseCase = new CreateUserUseCase(userRepository, emailGeneratorService);

const normalizeString = (value: any): string => (typeof value === 'string' ? value.trim() : value);

const getDisplayRole = (roles: any): string => {
    if (Array.isArray(roles) && roles.length > 0) {
        return roles.includes('ADMIN') ? 'ADMIN' : roles[0];
    }
    if (typeof roles === 'string' && roles.trim()) {
        return roles.includes('ADMIN') ? 'ADMIN' : roles;
    }
    return 'USER';
};

const sanitizeUser = (user: any): any => {
    if (!user) {
        return null;
    }
    const { password, ...safeUser } = user;
    return {
        ...safeUser,
        role: getDisplayRole(user.roles)
    };
};

export class UserController {
    static async create(req: Request, res: Response): Promise<any> {
        try {
            const { nombres, apellidos, identificacion, fechaNacimiento, personaId, roleName } = req.body;
            let targetPersonaId = personaId;

            if (!targetPersonaId) {
                if (!nombres || !apellidos || !identificacion) {
                    throw new Error('Para crear un usuario debes enviar datos de la persona o un personaId existente.');
                }
                UserValidator.validateIdentificacion(identificacion);
                const existingPerson = await userRepository.findPersonaByIdentification(identificacion);
                if (existingPerson) {
                    targetPersonaId = existingPerson.idpersona;
                } else {
                    const persona = await userRepository.createPersona({ nombres, apellidos, identificacion, fechaNacimiento });
                    targetPersonaId = persona.idpersona;
                }
            }

            const cuentaExistente = await userRepository.findByPersonaId(targetPersonaId);
            if (cuentaExistente) {
                throw new Error('Esta persona ya tiene una cuenta registrada como máximo. No se permiten cuentas múltiples.');
            }

            const newUser = await createUserUseCase.execute({
                ...req.body,
                personaId: targetPersonaId,
                nombresPersona: nombres || req.body.nombresPersona,
                apellidosPersona: apellidos || req.body.apellidosPersona,
                roleName: roleName || req.body.roleName || 'USER'
            });

            return res.status(201).json({ message: "Usuario creado exitosamente.", user: newUser });
        } catch (error: any) {
            return res.status(400).json({ message: error.message });
        }
    }

    static async getUserSessions(req: Request, res: Response): Promise<any> {
        try {
            const { userId } = req.params;
            const query = 'SELECT * FROM Sessions WHERE usuarios_idUsuario = $1 ORDER BY FechaIngreso DESC';
            const result = await pool.query(query, [userId]);
            return res.status(200).json(result.rows);
        } catch (error) {
            return res.status(500).json({ message: "Error al obtener las sesiones." });
        }
    }

    static async getAll(req: Request, res: Response): Promise<any> {
        try {
            const users = await userRepository.findAllDetailed(req.query);
            const normalizedUsers = users.map((user: any) => sanitizeUser(user));
            return res.status(200).json(normalizedUsers);
        } catch (error) {
            return res.status(500).json({ message: "Error al obtener los usuarios." });
        }
    }

    static async getMe(req: Request, res: Response): Promise<any> {
        try {
            const user = await userRepository.findDetailedById(req.user.id);
            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado.' });
            }
            return res.status(200).json(sanitizeUser(user));
        } catch (error) {
            return res.status(500).json({ message: 'Error al obtener tu información.' });
        }
    }

    static async getMySummary(req: Request, res: Response): Promise<any> {
        try {
            const user = await userRepository.findDetailedById(req.user.id);
            const latestSession = await userRepository.findLatestSessionByUserId(req.user.id);
            const failedAttempts = await userRepository.findLastFailedAttemptsByUserId(req.user.id);

            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado.' });
            }

            return res.status(200).json({
                user: sanitizeUser(user),
                latestSession,
                failedAttempts: failedAttempts.intentosFallidos || 0
            });
        } catch (error) {
            return res.status(500).json({ message: 'Error al obtener el resumen del usuario.' });
        }
    }

    static async getMenu(req: Request, res: Response): Promise<any> {
        try {
            const menu = await userRepository.findMenuByUserId(req.user.id);
            const normalizedMenu = menu.map((item: any) => ({
                id: item.option === 'DASHBOARD_STATS' ? 'stats' : item.option === 'MAINTENANCE' ? 'maintenance' : 'welcome',
                label: item.label,
                option: item.option
            }));
            return res.status(200).json(normalizedMenu);
        } catch (error) {
            return res.status(500).json({ message: 'Error al obtener el menú.' });
        }
    }

    static async updateRole(req: Request, res: Response): Promise<any> {
        try {
            const { id } = req.params;
            const { roleName } = req.body;

            if (!['ADMIN', 'USER'].includes(roleName)) {
                return res.status(400).json({ message: 'El rol debe ser ADMIN o USER.' });
            }

            const targetUser = await userRepository.findDetailedById(Number(id));
            if (!targetUser) {
                return res.status(404).json({ message: 'Usuario no encontrado.' });
            }

            const targetIsAdmin = getDisplayRole(targetUser.roles) === 'ADMIN';

            if (targetIsAdmin && roleName !== 'ADMIN') {
                return res.status(403).json({ message: 'No se puede degradar a otro administrador desde esta prueba.' });
            }

            await userRepository.syncUserRole(Number(id), roleName);
            const updatedUser = await userRepository.findDetailedById(Number(id));

            return res.status(200).json({
                message: 'Rol actualizado correctamente.',
                user: sanitizeUser(updatedUser)
            });
        } catch (error: any) {
            return res.status(400).json({ message: error.message || 'Error al actualizar el rol.' });
        }
    }

    static async update(req: Request, res: Response): Promise<any> {
        try {
            const { id } = req.params;
            const targetUser = await userRepository.findDetailedById(Number(id));

            if (!targetUser) {
                return res.status(404).json({ message: 'Usuario no encontrado.' });
            }

            const requesterId = Number(req.user.id);
            const targetId = Number(id);
            const requesterIsAdmin = req.user.role === 'ADMIN';
            const targetIsAdmin = getDisplayRole(targetUser.roles) === 'ADMIN';

            if (!requesterIsAdmin && requesterId !== targetId) {
                return res.status(403).json({ message: 'Solo puedes actualizar tus propios datos.' });
            }

            if (requesterIsAdmin && targetIsAdmin && requesterId !== targetId) {
                return res.status(403).json({ message: 'No puedes modificar otros administradores.' });
            }

            const updateData = {
                nombres: normalizeString(req.body.nombres),
                apellidos: normalizeString(req.body.apellidos),
                identificacion: normalizeString(req.body.identificacion),
                fechaNacimiento: req.body.fechaNacimiento || null,
                userName: normalizeString(req.body.userName),
                mail: normalizeString(req.body.mail),
                status: requesterIsAdmin ? normalizeString(req.body.status) : undefined,
                sessionActive: normalizeString(req.body.sessionActive),
                intentosFallidos: req.body.intentosFallidos,
                password: req.body.password ? await bcrypt.hash(req.body.password, 10) : undefined
            };

            const updatedUser = await userRepository.update(Number(id), updateData);
            return res.status(200).json({ message: "Usuario actualizado", user: sanitizeUser(updatedUser) });
        } catch (error: any) {
            return res.status(400).json({ message: error.message || "Error al actualizar el usuario." });
        }
    }

    static async importBulk(req: Request, res: Response): Promise<any> {
        try {
            const rows = Array.isArray(req.body.rows) ? req.body.rows : [];

            if (!rows.length) {
                return res.status(400).json({ message: 'No se recibieron filas para importar.' });
            }

            const result: any = {
                created: 0,
                updated: 0,
                skipped: 0,
                details: []
            };

            for (const rawRow of rows) {
                const identificacion = normalizeString(rawRow.identificacion || rawRow.Identificacion || rawRow.cedula);
                const nombres = normalizeString(rawRow.nombres || rawRow.Nombres || rawRow.nombre);
                const apellidos = normalizeString(rawRow.apellidos || rawRow.Apellidos || rawRow.apellido);
                const fechaNacimiento = rawRow.fechaNacimiento || rawRow.FechaNacimiento || null;
                const userName = normalizeString(rawRow.userName || rawRow.username || rawRow.UserName);
                const mail = normalizeString(rawRow.mail || rawRow.email || rawRow.Mail);
                const status = normalizeString(rawRow.status || rawRow.Status);

                if (!identificacion || !nombres || !apellidos) {
                    result.skipped += 1;
                    result.details.push({ identificacion, message: 'Faltan campos obligatorios.' });
                    continue;
                }

                const existing = await userRepository.findDetailedByIdentificationOrUserName(identificacion, userName, mail);

                if (existing) {
                    await userRepository.update(existing.id, {
                        nombres,
                        apellidos,
                        identificacion,
                        fechaNacimiento,
                        userName: userName || existing.userName,
                        mail: mail || existing.email,
                        status: status || undefined
                    });
                    result.updated += 1;
                    result.details.push({ identificacion, message: 'Usuario actualizado.' });
                    continue;
                }

                const persona = await userRepository.createPersona({
                    nombres,
                    apellidos,
                    identificacion,
                    fechaNacimiento
                });

                const generatedUserName = userName || `${nombres.charAt(0).toUpperCase()}${apellidos.split(' ')[0].toLowerCase()}${identificacion.slice(-4)}`;
                const generatedMail = mail || await emailGeneratorService.generate(nombres, apellidos);
                const temporaryPassword = rawRow.password || crypto.randomBytes(6).toString('hex');
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(temporaryPassword, salt);

                await userRepository.create({
                    userName: generatedUserName,
                    password: hashedPassword,
                    mail: generatedMail,
                    personaId: persona.idpersona,
                    status: status || 'ACTIVO'
                });

                const createdUser = await userRepository.findByEmail(generatedMail);
                if (createdUser) {
                    await userRepository.assignRoleToUser(createdUser.idusuario, 'USER');
                }

                result.created += 1;
                result.details.push({ identificacion, temporaryPassword, message: 'Usuario creado.' });
            }

            return res.status(200).json({ message: 'Carga masiva procesada correctamente.', ...result });
        } catch (error: any) {
            return res.status(500).json({ message: error.message || 'Error al procesar la carga masiva.' });
        }
    }

    static async delete(req: Request, res: Response): Promise<any> {
        try {
            const { id } = req.params;
            await userRepository.delete(Number(id));
            return res.status(200).json({ message: "Usuario eliminado correctamente (Soft Delete)." });
        } catch (error) {
            return res.status(500).json({ message: "Error al eliminar el usuario." });
        }
    }

    static async getDashboardStats(req: Request, res: Response): Promise<any> {
        try {
            const activosResult = await pool.query("SELECT COUNT(*) FROM usuarios WHERE SessionActive = '1'");
            const inactivosResult = await pool.query("SELECT COUNT(*) FROM usuarios WHERE SessionActive = '0'");
            const bloqueadosResult = await pool.query("SELECT COUNT(*) FROM usuarios WHERE Status = 'BLOQUEADO'");
            const fallidosResult = await pool.query("SELECT SUM(intentos_fallidos) as total_fallidos FROM usuarios");

            return res.status(200).json({
                usuariosActivos: parseInt(activosResult.rows[0].count),
                usuariosInactivos: parseInt(inactivosResult.rows[0].count),
                usuariosBloqueados: parseInt(bloqueadosResult.rows[0].count),
                totalIntentosFallidos: parseInt(fallidosResult.rows[0].total_fallidos || 0)
            });
        } catch (error) {
            return res.status(500).json({ message: "Error al cargar estadísticas del dashboard." });
        }
    }
}