import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { validateParams } from '../middleware/validate';
import { idParamSchema } from '../validation/schemas';
import * as shipmentController from '../controllers/shipmentController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Shipment services (available to all authenticated users)
router.get('/services', shipmentController.getAvailableServices);

// Shipment routes
router.get('/:id', validateParams(idParamSchema), shipmentController.getShipmentById);
router.put('/:id', requireRole('MANAGER'), validateParams(idParamSchema), shipmentController.updateShipment);
router.delete('/:id', requireRole('MANAGER'), validateParams(idParamSchema), shipmentController.deleteShipment);
router.post('/:id/refresh-status', requireRole('MANAGER'), validateParams(idParamSchema), shipmentController.refreshShipmentStatus);

export default router;
