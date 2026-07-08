"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginUserUseCase = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class LoginUserUseCase {
    userRepository;
    sessionRepository;
    constructor(userRepository, sessionRepository) {
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
    }
    async execute(identificador, passwordPlana) {
        let user = await this.userRepository.findByEmail(identificador);
        if (!user) {
            user = await this.userRepository.findByUsername(identificador);
        }
        if (!user) {
            throw new Error("Credenciales incorrectas.");
        }
        const userStatus = String(user.status || '').toUpperCase();
        if (userStatus === 'BLOQUEADO') {
            throw new Error("Su cuenta ha sido bloqueada por exceder los intentos fallidos.");
        }
        if (userStatus === 'INACTIVO') {
            throw new Error("Su cuenta está inactiva. Contacte al administrador para reactivarla.");
        }
        if (userStatus !== 'ACTIVO') {
            throw new Error("Su cuenta no está habilitada para iniciar sesión.");
        }
        if (user.sessionactive === '1') {
            throw new Error("El usuario ya tiene una sesión activa en este momento.");
        }
        const passwordValida = await bcrypt_1.default.compare(passwordPlana, user.password);
        if (!passwordValida) {
            await this.userRepository.registerFailedAttempt(user.idusuario);
            const intentosActuales = user.intentos_fallidos + 1;
            if (intentosActuales >= 3) {
                throw new Error("Su cuenta ha sido bloqueada tras 3 intentos fallidos de inicio de sesión.");
            }
            else {
                throw new Error(`Contraseña incorrecta. Le quedan ${3 - intentosActuales} intentos.`);
            }
        }
        await this.sessionRepository.createSession(user.idusuario);
        await this.userRepository.update(user.idusuario, {
            sessionActive: '1',
            intentosFallidos: 0
        });
        const role = await this.userRepository.findRoleByUserId(user.idusuario);
        const token = jsonwebtoken_1.default.sign({ id: user.idusuario, username: user.username, role }, process.env.JWT_SECRET, { expiresIn: '8h' });
        return { token, user: { id: user.idusuario, username: user.username, email: user.mail, role } };
    }
}
exports.LoginUserUseCase = LoginUserUseCase;
