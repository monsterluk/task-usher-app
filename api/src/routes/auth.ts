import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as authController from '../controllers/authController';

const router = Router();

// Public routes
router.post('/login', authController.login);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.put('/change-password', authenticate, authController.changePassword);

// Manager only - register new users
router.post('/register', authenticate, requireRole('MANAGER'), authController.register);

export default router;
