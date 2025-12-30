import { Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';

// GET /api/announcements
export const getAnnouncements = asyncHandler(async (req: AuthRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const active_only = req.query.active_only !== 'false';

  let sql = `
    SELECT a.*, w.name as author_name
    FROM announcements a
    LEFT JOIN workers w ON w.id = a.created_by
  `;

  if (active_only) {
    sql += ` WHERE a.active = true AND (a.expires_at IS NULL OR a.expires_at > NOW())`;
  }

  sql += ` ORDER BY a.pinned DESC, a.created_at DESC LIMIT $1`;

  const result = await query(sql, [limit]);

  res.json({
    success: true,
    data: { announcements: result.rows }
  });
});

// GET /api/announcements/:id
export const getAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const result = await query(`
    SELECT a.*, w.name as author_name
    FROM announcements a
    LEFT JOIN workers w ON w.id = a.created_by
    WHERE a.id = $1
  `, [id]);

  if (result.rows.length === 0) {
    throw new AppError('Ogłoszenie nie znalezione', 404);
  }

  res.json({
    success: true,
    data: { announcement: result.rows[0] }
  });
});

// POST /api/announcements
export const createAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const userName = req.user?.name || 'System';
  const { title, content, type, priority, pinned, expires_at } = req.body;

  if (!title || !content) {
    throw new AppError('Tytuł i treść są wymagane', 400);
  }

  const result = await query(`
    INSERT INTO announcements (title, content, type, priority, pinned, expires_at, created_by, author_id, author_name, active)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, true)
    RETURNING *
  `, [title, content, type || 'info', priority || 'normal', pinned || false, expires_at, userId, userName]);

  logger.info(`Announcement created: ${title} by user ${userId}`);

  res.status(201).json({
    success: true,
    data: { announcement: result.rows[0] }
  });
});

// PUT /api/announcements/:id
export const updateAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, content, type, priority, pinned, expires_at, active } = req.body;

  const result = await query(`
    UPDATE announcements
    SET title = COALESCE($1, title),
        content = COALESCE($2, content),
        type = COALESCE($3, type),
        priority = COALESCE($4, priority),
        pinned = COALESCE($5, pinned),
        expires_at = $6,
        active = COALESCE($7, active),
        updated_at = NOW()
    WHERE id = $8
    RETURNING *
  `, [title, content, type, priority, pinned, expires_at, active, id]);

  if (result.rows.length === 0) {
    throw new AppError('Ogłoszenie nie znalezione', 404);
  }

  res.json({
    success: true,
    data: { announcement: result.rows[0] }
  });
});

// DELETE /api/announcements/:id
export const deleteAnnouncement = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const result = await query('DELETE FROM announcements WHERE id = $1 RETURNING id', [id]);

  if (result.rows.length === 0) {
    throw new AppError('Ogłoszenie nie znalezione', 404);
  }

  res.json({
    success: true,
    message: 'Ogłoszenie usunięte'
  });
});
