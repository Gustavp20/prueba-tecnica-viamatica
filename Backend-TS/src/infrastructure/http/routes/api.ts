import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { UserController } from '../controllers/UserController';
import { isAdmin, verifyToken } from '../../security/authMiddleware';

const router = Router();

router.post('/auth/login', AuthController.login);
router.post('/auth/recover', AuthController.recover);
router.post('/auth/logout', verifyToken, AuthController.logout);

router.get('/admin/users/:userId/sessions', verifyToken, isAdmin, UserController.getUserSessions);

router.post('/users', verifyToken, isAdmin, UserController.create);
router.get('/users', verifyToken, isAdmin, UserController.getAll);
router.get('/users/me', verifyToken, UserController.getMe);
router.get('/users/me/summary', verifyToken, UserController.getMySummary);
router.get('/menus', verifyToken, UserController.getMenu);
router.put('/users/:id', verifyToken, UserController.update);
router.post('/users/import', verifyToken, isAdmin, UserController.importBulk);
router.put('/users/:id/role', verifyToken, isAdmin, UserController.updateRole);
router.delete('/users/:id', verifyToken, isAdmin, UserController.delete);
router.get('/dashboard/stats', verifyToken, isAdmin, UserController.getDashboardStats);

export default router;