import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validate';
import { idParamSchema } from '../validation/schemas';
import * as machinesController from '../controllers/machinesController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all machines (all authenticated users can view)
router.get('/', machinesController.getAllMachines);

// Get machine by ID
router.get('/:id', validateParams(idParamSchema), machinesController.getMachineById);

// Create machine (Manager only)
router.post('/', requireRole('MANAGER'), machinesController.createMachine);

// Update machine (Manager only)
router.put('/:id', requireRole('MANAGER'), validateParams(idParamSchema), machinesController.updateMachine);

// Delete machine (Manager only)
router.delete('/:id', requireRole('MANAGER'), validateParams(idParamSchema), machinesController.deleteMachine);

// Update machine status (Manager only)
router.put('/:id/status', requireRole('MANAGER'), validateParams(idParamSchema), machinesController.updateMachineStatus);

export default router;
