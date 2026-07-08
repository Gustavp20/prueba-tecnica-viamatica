import { Request, Response } from 'express';
import { LoginUserUseCase } from '../../../application/use-cases/LoginUserUseCase';
import { UserRepository } from '../../repositories/UserRepository';
import { SessionRepository } from '../../repositories/SessionRepository';

const userRepository = new UserRepository();
const sessionRepository = new SessionRepository();
const loginUserUseCase = new LoginUserUseCase(userRepository, sessionRepository);

export class AuthController {
    static async login(req: Request, res: Response): Promise<any> {
        try {
            const { identificador, password } = req.body;

            if (!identificador || !password) {
                return res.status(400).json({ message: "El identificador y la contraseña son requeridos." });
            }

            const result = await loginUserUseCase.execute(identificador, password);
            return res.status(200).json({ message: "Login exitoso", ...result });
        } catch (error: any) {
            return res.status(401).json({ message: error.message });
        }
    }

    static async logout(req: Request, res: Response): Promise<any> {
        try {
            const userId = req.user.id; // Viene del token JWT
            
            await sessionRepository.closeSession(userId);
            await userRepository.update(userId, { sessionActive: '0' });

            return res.status(200).json({ message: "Sesión cerrada correctamente." });
        } catch (error) {
            return res.status(500).json({ message: "Error al cerrar sesión." });
        }
    }

    static async recover(req: Request, res: Response): Promise<any> {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({ message: 'El correo electrónico es requerido.' });
            }

            const user = await userRepository.findByEmail(email);

            if (!user) {
                return res.status(200).json({ message: 'Si el correo está registrado, recibirás instrucciones de recuperación.' });
            }

            return res.status(200).json({
                message: 'Si el correo está registrado, recibirás instrucciones de recuperación.',
                email: user.mail
            });
        } catch (error) {
            return res.status(500).json({ message: 'Error al procesar la recuperación.' });
        }
    }
}