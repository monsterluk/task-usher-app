import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { validateParams } from '../middleware/validate';
import { idParamSchema } from '../validation/schemas';
import * as announcementsController from '../controllers/announcementsController';

const router = Router();

// Public - get announcements (authenticated users)
router.get('/', authenticate, announcementsController.getAnnouncements);
router.get('/:id', authenticate, validateParams(idParamSchema), announcementsController.getAnnouncement);

// Admin/Manager only - create, update, delete
router.post('/', authenticate, requireRole('KIEROWNIK'), announcementsController.createAnnouncement);
router.put('/:id', authenticate, requireRole('KIEROWNIK'), validateParams(idParamSchema), announcementsController.updateAnnouncement);
router.delete('/:id', authenticate, requireRole('KIEROWNIK'), validateParams(idParamSchema), announcementsController.deleteAnnouncement);

export default router;
