import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as shipmentController from '../controllers/shipmentController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Shipment services (available to all authenticated users)
router.get('/services', shipmentController.getAvailableServices);

// Shipment routes
router.get('/:id', shipmentController.getShipmentById);
router.put('/:id', requireRole('MANAGER'), shipmentController.updateShipment);
router.delete('/:id', requireRole('MANAGER'), shipmentController.deleteShipment);
router.post('/:id/refresh-status', requireRole('MANAGER'), shipmentController.refreshShipmentStatus);

export default router;
