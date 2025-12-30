import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { validateParams } from '../middleware/validate';
import { idParamSchema } from '../validation/schemas';
import * as maintenanceController from '../controllers/maintenanceController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============ SCHEDULES ============

// Get all schedules
router.get('/schedules', maintenanceController.getSchedules);

// Get schedule by ID
router.get('/schedules/:id', validateParams(idParamSchema), maintenanceController.getScheduleById);

// Create schedule (Manager only)
router.post('/schedules', requireRole('MANAGER'), maintenanceController.createSchedule);

// Update schedule (Manager only)
router.put('/schedules/:id', requireRole('MANAGER'), validateParams(idParamSchema), maintenanceController.updateSchedule);

// Delete schedule (Manager only)
router.delete('/schedules/:id', requireRole('MANAGER'), validateParams(idParamSchema), maintenanceController.deleteSchedule);

// Start maintenance
router.post('/schedules/:id/start', validateParams(idParamSchema), maintenanceController.startMaintenance);

// Complete maintenance
router.post('/schedules/:id/complete', validateParams(idParamSchema), maintenanceController.completeMaintenance);

// ============ LOGS ============

// Get maintenance logs
router.get('/logs', maintenanceController.getLogs);

// ============ STATS ============

// Get maintenance statistics
router.get('/stats', maintenanceController.getMaintenanceStats);

export default router;
