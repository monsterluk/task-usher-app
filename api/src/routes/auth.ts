import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as authController from '../controllers/authController';

const router = Router();

// Public routes - logowanie
router.post('/login', authController.login);  // email + password
router.post('/pin', authController.loginWithPin);  // PIN (główny sposób logowania)

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.put('/change-password', authenticate, authController.changePassword);

// Admin/Kierownik only - register new users
router.post('/register', authenticate, requireRole('ADMIN', 'KIEROWNIK'), authController.register);

export default router;
