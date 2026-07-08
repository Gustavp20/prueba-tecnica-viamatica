import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class LoginUserUseCase {
    private userRepository: any;
    private sessionRepository: any;

    constructor(userRepository: any, sessionRepository: any) {
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
    }

    async execute(identificador: string, passwordPlana: string): Promise<any> {
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

        const passwordValida = await bcrypt.compare(passwordPlana, user.password);

        if (!passwordValida) {
            await this.userRepository.registerFailedAttempt(user.idusuario);
            
            const intentosActuales = user.intentos_fallidos + 1;
            if (intentosActuales >= 3) {
                throw new Error("Su cuenta ha sido bloqueada tras 3 intentos fallidos de inicio de sesión.");
            } else {
                throw new Error(`Contraseña incorrecta. Le quedan ${3 - intentosActuales} intentos.`);
            }
        }

        await this.sessionRepository.createSession(user.idusuario);
        
        await this.userRepository.update(user.idusuario, { 
            sessionActive: '1', 
            intentosFallidos: 0 
        });

        const role = await this.userRepository.findRoleByUserId(user.idusuario);

        const token = jwt.sign(
            { id: user.idusuario, username: user.username, role },
            process.env.JWT_SECRET as string,
            { expiresIn: '8h' }
        );

        return { token, user: { id: user.idusuario, username: user.username, email: user.mail, role } };
    }
}