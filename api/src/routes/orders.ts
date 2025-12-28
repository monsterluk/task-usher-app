import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as orderController from '../controllers/orderController';
import * as stageController from '../controllers/stageController';
import * as shipmentController from '../controllers/shipmentController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Orders
router.get('/', orderController.getAllOrders);
router.get('/:id', orderController.getOrderById);
router.post('/', requireRole('MANAGER'), orderController.createOrder);
router.put('/:id', requireRole('MANAGER'), orderController.updateOrder);
router.delete('/:id', requireRole('MANAGER'), orderController.deleteOrder);
router.post('/:id/archive', requireRole('MANAGER'), orderController.archiveOrder);
router.post('/:id/unarchive', requireRole('MANAGER'), orderController.unarchiveOrder);

// Stages (nested under orders)
router.get('/:orderId/stages', stageController.getOrderStages);
router.post('/:orderId/stages', requireRole('MANAGER'), stageController.createStage);

// Shipments (nested under orders)
router.get('/:orderId/shipments', shipmentController.getOrderShipments);
router.post('/:orderId/shipments', requireRole('MANAGER'), shipmentController.createShipment);

export default router;
