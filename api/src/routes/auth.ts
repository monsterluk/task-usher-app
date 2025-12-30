import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { authLimiter, passwordChangeLimiter } from '../middleware/rateLimit';
import { loginSchema, pinLoginSchema, createWorkerSchema } from '../validation/schemas';
import * as authController from '../controllers/authController';

const router = Router();

// Public routes - logowanie (with rate limiting)
router.post('/login', authLimiter, validateBody(loginSchema), authController.login);  // email + password
router.post('/pin', authLimiter, validateBody(pinLoginSchema), authController.loginWithPin);  // PIN (główny sposób logowania)

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.put('/change-password', authenticate, passwordChangeLimiter, authController.changePassword);

// Admin/Kierownik only - register new users
router.post('/register', authenticate, requireRole('ADMIN', 'KIEROWNIK'), validateBody(createWorkerSchema), authController.register);

export default router;
