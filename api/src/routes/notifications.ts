import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { validateParams } from '../middleware/validate';
import { idParamSchema } from '../validation/schemas';
import * as notificationsController from '../controllers/notificationsController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get user's notifications
router.get('/', notificationsController.getNotifications);

// Mark notifications as read
router.post('/mark-read', notificationsController.markAsRead);

// Delete notification
router.delete('/:id', validateParams(idParamSchema), notificationsController.deleteNotification);

// Create notification (Manager only)
router.post('/', requireRole('MANAGER'), notificationsController.createNotification);

// Broadcast notification (Manager only)
router.post('/broadcast', requireRole('MANAGER'), notificationsController.broadcastNotification);

export default router;
