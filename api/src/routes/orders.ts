import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validate';
import { createOrderSchema, updateOrderSchema, idParamSchema } from '../validation/schemas';
import * as orderController from '../controllers/orderController';
import * as stageController from '../controllers/stageController';
import * as shipmentController from '../controllers/shipmentController';
import * as qualityController from '../controllers/qualityController';
import * as bomController from '../controllers/bomController';
import * as traceabilityController from '../controllers/traceabilityController';
import * as integrationController from '../controllers/integrationController';
import * as orderItemsController from '../controllers/orderItemsController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Orders
router.get('/', orderController.getAllOrders);
router.get('/:id', validateParams(idParamSchema), orderController.getOrderById);
router.post('/', requireRole('MANAGER'), validateBody(createOrderSchema), orderController.createOrder);
router.put('/:id', requireRole('MANAGER'), validateParams(idParamSchema), validateBody(updateOrderSchema), orderController.updateOrder);
router.delete('/:id', requireRole('MANAGER'), validateParams(idParamSchema), orderController.deleteOrder);
router.post('/:id/archive', requireRole('MANAGER'), validateParams(idParamSchema), orderController.archiveOrder);
router.post('/:id/unarchive', requireRole('MANAGER'), validateParams(idParamSchema), orderController.unarchiveOrder);

// Stages (nested under orders)
router.get('/:orderId/stages', stageController.getOrderStages);
router.post('/:orderId/stages', requireRole('MANAGER'), stageController.createStage);

// Shipments (nested under orders)
router.get('/:orderId/shipments', shipmentController.getOrderShipments);
router.post('/:orderId/shipments', requireRole('MANAGER'), shipmentController.createShipment);

// Quality checks (nested under orders)
router.get('/:orderId/quality-checks', qualityController.getOrderQualityChecks);
router.post('/:orderId/quality-checks', qualityController.createQualityCheck);

// Defects (nested under orders)
router.get('/:orderId/defects', qualityController.getOrderDefects);
router.post('/:orderId/defects', qualityController.createDefect);

// BOM (Bill of Materials) - nested under orders
router.get('/:orderId/bom', bomController.getOrderBom);
router.post('/:orderId/bom', requireRole('MANAGER'), bomController.createOrderBomOrAddItem);
router.put('/:orderId/bom', bomController.updateOrderBom);

// Traceability events - nested under orders
router.get('/:orderId/events', traceabilityController.getOrderEvents);

// Invoices - nested under orders
router.get('/:orderId/invoices', integrationController.getOrderInvoices);

// Order items - nested under orders
router.get('/:orderId/items', orderItemsController.getOrderItems);
router.post('/:orderId/items', requireRole('MANAGER'), orderItemsController.createOrderItem);

export default router;
