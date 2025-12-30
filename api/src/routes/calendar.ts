import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { validateParams } from '../middleware/validate';
import { idParamSchema } from '../validation/schemas';
import * as calendarController from '../controllers/calendarController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get calendar events
router.get('/events', calendarController.getCalendarEvents);

// Create calendar event (Manager only)
router.post('/events', requireRole('MANAGER'), calendarController.createCalendarEvent);

// Update calendar event (Manager only)
router.put('/events/:id', requireRole('MANAGER'), validateParams(idParamSchema), calendarController.updateCalendarEvent);

// Delete calendar event (Manager only)
router.delete('/events/:id', requireRole('MANAGER'), validateParams(idParamSchema), calendarController.deleteCalendarEvent);

// Get production schedule (Gantt view)
router.get('/production-schedule', calendarController.getProductionSchedule);

// Get worker schedule
router.get('/workers/:workerId/schedule', calendarController.getWorkerSchedule);

// Sync with Google Calendar
router.post('/google/sync', requireRole('MANAGER'), calendarController.syncGoogleCalendar);

export default router;
