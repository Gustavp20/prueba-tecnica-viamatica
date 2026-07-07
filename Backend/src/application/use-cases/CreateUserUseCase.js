const bcrypt = require('bcrypt');
const UserValidator = require('../../domain/value-objects/UserValidator');

class CreateUserUseCase {
    constructor(userRepository, emailGeneratorService) {
        this.userRepository = userRepository;
        this.emailGeneratorService = emailGeneratorService;
    }

    async execute(userData) {
        const cuentaExistente = await this.userRepository.findByPersonaId(userData.personaId);
        if (cuentaExistente) {
            throw new Error("Esta persona ya tiene una cuenta registrada como máximo. No se permiten cuentas múltiples.");
        }

        UserValidator.validateUsername(userData.userName);

        const usernameDuplicado = await this.userRepository.findByUsername(userData.userName);
        if (usernameDuplicado) {
            throw new Error("El nombre de usuario ya está en uso.");
        }

        UserValidator.validatePassword(userData.password);

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password, salt);

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

module.exports = CreateUserUseCase;