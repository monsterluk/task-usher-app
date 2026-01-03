import { Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/var/www/plexisystem/uploads';

// GET /api/orders/:orderId/attachments
export const getOrderAttachments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { orderId } = req.params;

  const result = await query(
    `SELECT
      d.id,
      d.order_id,
      d.filename,
      d.original_name,
      d.mime_type,
      d.file_size,
      d.category,
      d.description,
      d.created_at,
      d.uploaded_by,
      w.name as uploader_name
    FROM documents d
    LEFT JOIN workers w ON d.uploaded_by = w.id
    WHERE d.order_id = $1 AND d.is_current = true
    ORDER BY d.created_at DESC`,
    [orderId]
  );

  res.json({
    success: true,
    data: result.rows
  });
});

// POST /api/orders/:orderId/attachments
export const uploadAttachment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { orderId } = req.params;
  const userId = req.user?.id;

  // Check if multer processed the file
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'Nie przesłano pliku'
    });
  }

  const file = req.file;
  const { description, category = 'other' } = req.body;

  // Generate unique filename
  const ext = path.extname(file.originalname);
  const filename = `order_${orderId}_${Date.now()}${ext}`;
  const filePath = path.join(UPLOAD_DIR, 'orders', orderId.toString(), filename);

  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Move uploaded file
  fs.renameSync(file.path, filePath);

  // Save to database
  const result = await query(
    `INSERT INTO documents (order_id, filename, original_name, mime_type, file_size, file_path, category, description, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [orderId, filename, file.originalname, file.mimetype, file.size, filePath, category, description, userId]
  );

  const document = result.rows[0];

  // Get uploader name
  const uploaderResult = await query('SELECT name FROM workers WHERE id = $1', [userId]);
  if (uploaderResult.rows.length > 0) {
    document.uploader_name = uploaderResult.rows[0].name;
  }

  logger.info(`Attachment uploaded to order ${orderId} by user ${userId}: ${file.originalname}`);

  res.status(201).json({
    success: true,
    data: document
  });
});

// DELETE /api/orders/:orderId/attachments/:attachmentId
export const deleteAttachment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { orderId, attachmentId } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  // Check if attachment exists
  const attachmentResult = await query(
    'SELECT * FROM documents WHERE id = $1 AND order_id = $2',
    [attachmentId, orderId]
  );

  if (attachmentResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Załącznik nie znaleziony'
    });
  }

  const attachment = attachmentResult.rows[0];

  // Only allow deletion by uploader or admin/kierownik
  if (attachment.uploaded_by !== userId && !['ADMIN', 'KIEROWNIK'].includes(userRole || '')) {
    return res.status(403).json({
      success: false,
      error: 'Brak uprawnień do usunięcia załącznika'
    });
  }

  // Delete file from disk
  if (attachment.file_path && fs.existsSync(attachment.file_path)) {
    fs.unlinkSync(attachment.file_path);
  }

  // Delete from database
  await query('DELETE FROM documents WHERE id = $1', [attachmentId]);

  logger.info(`Attachment ${attachmentId} deleted from order ${orderId} by user ${userId}`);

  res.json({
    success: true,
    message: 'Załącznik usunięty'
  });
});

// GET /api/orders/:orderId/attachments/:attachmentId/download
export const downloadAttachment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { orderId, attachmentId } = req.params;

  const result = await query(
    'SELECT * FROM documents WHERE id = $1 AND order_id = $2',
    [attachmentId, orderId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Załącznik nie znaleziony'
    });
  }

  const attachment = result.rows[0];

  if (!attachment.file_path || !fs.existsSync(attachment.file_path)) {
    return res.status(404).json({
      success: false,
      error: 'Plik nie istnieje'
    });
  }

  res.download(attachment.file_path, attachment.original_name);
});
