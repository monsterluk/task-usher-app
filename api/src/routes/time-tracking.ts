import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  getWorkTimeEntries,
  getWorkTimeEntry,
  createWorkTimeEntry,
  updateWorkTimeEntry,
  deleteWorkTimeEntry,
  clockIn,
  clockOut,
  getDaysOff,
  createDayOff,
  updateDayOff,
  approveDayOff,
  deleteDayOff,
  getWorkerWorkCard,
  getMonthlySummary,
  getSettings,
  updateSetting,
} from '../controllers/timeTrackingController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Work Time Entries
router.get('/entries', getWorkTimeEntries);
router.get('/entries/:id', getWorkTimeEntry);
router.post('/entries', requireRole('KIEROWNIK', 'ADMIN'), createWorkTimeEntry);
router.put('/entries/:id', requireRole('KIEROWNIK', 'ADMIN'), updateWorkTimeEntry);
router.delete('/entries/:id', requireRole('KIEROWNIK', 'ADMIN'), deleteWorkTimeEntry);

// Clock In/Out (for workers)
router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);

// Days Off
router.get('/days-off', getDaysOff);
router.post('/days-off', createDayOff);
router.put('/days-off/:id', updateDayOff);
router.post('/days-off/:id/approve', requireRole('KIEROWNIK', 'ADMIN'), approveDayOff);
router.delete('/days-off/:id', requireRole('KIEROWNIK', 'ADMIN'), deleteDayOff);

// Reports
router.get('/work-card/:worker_id', getWorkerWorkCard);
router.get('/monthly-summary', requireRole('KIEROWNIK', 'ADMIN'), getMonthlySummary);

// Settings
router.get('/settings', getSettings);
router.put('/settings', requireRole('ADMIN'), updateSetting);

export default router;
