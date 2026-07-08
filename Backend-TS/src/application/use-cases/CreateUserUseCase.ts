import bcrypt from 'bcrypt';
import { UserValidator } from '../../domain/value-objects/UserValidator';


export interface CreateUserData {
    personaId: number;
    userName: string;
    password?: string; 
    nombresPersona: string;
    apellidosPersona: string;
    roleName?: string;
}

export class CreateUserUseCase {
    private userRepository: any;
    private emailGeneratorService: any;

    constructor(userRepository: any, emailGeneratorService: any) {
        this.userRepository = userRepository;
        this.emailGeneratorService = emailGeneratorService;
    }

    async execute(userData: CreateUserData): Promise<any> {
        const cuentaExistente = await this.userRepository.findByPersonaId(userData.personaId);
        if (cuentaExistente) {
            throw new Error("Esta persona ya tiene una cuenta registrada como máximo. No se permiten cuentas múltiples.");
        }

        UserValidator.validateUsername(userData.userName);

        const usernameDuplicado = await this.userRepository.findByUsername(userData.userName);
        if (usernameDuplicado) {
            throw new Error("El nombre de usuario ya está en uso.");
        }

        UserValidator.validatePassword(userData.password || '');

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password || '', salt);

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