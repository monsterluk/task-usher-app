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
import * as orderCommentsController from '../controllers/orderCommentsController';
import * as orderAttachmentsController from '../controllers/orderAttachmentsController';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || '/tmp/plexisystem/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip', 'application/x-rar-compressed',
      'text/plain', 'text/csv'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Niedozwolony typ pliku'));
    }
  }
});

const router = Router();

// All routes require authentication
router.use(authenticate);

// Orders
router.get('/', orderController.getAllOrders);
router.get('/:id', validateParams(idParamSchema), orderController.getOrderById);
router.post('/', requireRole('MANAGER', 'HANDLOWIEC'), validateBody(createOrderSchema), orderController.createOrder);
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

// Work summary - nested under orders
router.get('/:id/work-summary', validateParams(idParamSchema), orderController.getOrderWorkSummary);

// Comments - nested under orders
router.get('/:orderId/comments', orderCommentsController.getOrderComments);
router.post('/:orderId/comments', orderCommentsController.createComment);
router.delete('/:orderId/comments/:commentId', orderCommentsController.deleteComment);

// Attachments - nested under orders (using documents table)
router.get('/:orderId/attachments', orderAttachmentsController.getOrderAttachments);
router.post('/:orderId/attachments', upload.single('file'), orderAttachmentsController.uploadAttachment);
router.delete('/:orderId/attachments/:attachmentId', orderAttachmentsController.deleteAttachment);
router.get('/:orderId/attachments/:attachmentId/download', orderAttachmentsController.downloadAttachment);

export default router;
