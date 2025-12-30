import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as settingsController from '../controllers/settingsController';

const router = Router();

// GET /api/settings - Get system settings
router.get('/', authenticate, settingsController.getSettings);

// PUT /api/settings - Update system settings (ADMIN only)
router.put('/', authenticate, requireRole('ADMIN'), settingsController.updateSettings);

// POST /api/settings/init - Initialize settings table (ADMIN only)
router.post('/init', authenticate, requireRole('ADMIN'), settingsController.initSettings);

export default router;
