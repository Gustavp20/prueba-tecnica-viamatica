"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateUserUseCase = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const UserValidator_1 = require("../../domain/value-objects/UserValidator");
class CreateUserUseCase {
    userRepository;
    emailGeneratorService;
    constructor(userRepository, emailGeneratorService) {
        this.userRepository = userRepository;
        this.emailGeneratorService = emailGeneratorService;
    }
    async execute(userData) {
        const cuentaExistente = await this.userRepository.findByPersonaId(userData.personaId);
        if (cuentaExistente) {
            throw new Error("Esta persona ya tiene una cuenta registrada como máximo. No se permiten cuentas múltiples.");
        }
        UserValidator_1.UserValidator.validateUsername(userData.userName);
        const usernameDuplicado = await this.userRepository.findByUsername(userData.userName);
        if (usernameDuplicado) {
            throw new Error("El nombre de usuario ya está en uso.");
        }
        UserValidator_1.UserValidator.validatePassword(userData.password || '');
        const salt = await bcrypt_1.default.genSalt(10);
        const hashedPassword = await bcrypt_1.default.hash(userData.password || '', salt);
        const emailGenerado = await this.emailGeneratorService.generate(userData.nombresPersona, userData.apellidosPersona);
        const newUser = await this.userRepository.create({
            userName: userData.userName,
            password: hashedPassword,
            mail: emailGenerado,
            personaId: userData.personaId
        });
        await this.userRepository.assignRoleToUser(newUser.idusuario, userData.roleName || 'USER');
        return newUser;
    }
}
exports.CreateUserUseCase = CreateUserUseCase;
