import { Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

// GET /api/orders/:orderId/comments
export const getOrderComments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { orderId } = req.params;

  const result = await query(
    `SELECT
      c.id,
      c.order_id,
      c.content,
      c.created_at,
      c.user_id,
      c.user_name,
      c.is_internal,
      w.role as user_role
    FROM order_comments c
    LEFT JOIN workers w ON c.user_id = w.id
    WHERE c.order_id = $1
    ORDER BY c.created_at DESC`,
    [orderId]
  );

  res.json({
    success: true,
    data: result.rows
  });
});

// POST /api/orders/:orderId/comments
export const createComment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { orderId } = req.params;
  const { content, is_internal = false } = req.body;
  const userId = req.user?.id;
  const userName = req.user?.name || 'Nieznany';

  if (!content || content.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Treść komentarza jest wymagana'
    });
  }

  const result = await query(
    `INSERT INTO order_comments (order_id, content, user_id, user_name, is_internal)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [orderId, content.trim(), userId, userName, is_internal]
  );

  const comment = result.rows[0];

  // Add user role
  if (req.user?.role) {
    comment.user_role = req.user.role;
  }

  logger.info(`Comment added to order ${orderId} by user ${userId}`);

  res.status(201).json({
    success: true,
    data: comment
  });
});

// DELETE /api/orders/:orderId/comments/:commentId
export const deleteComment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { orderId, commentId } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  // Check if comment exists and belongs to user or user is admin/manager
  const commentResult = await query(
    'SELECT * FROM order_comments WHERE id = $1 AND order_id = $2',
    [commentId, orderId]
  );

  if (commentResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Komentarz nie znaleziony'
    });
  }

  const comment = commentResult.rows[0];

  // Only allow deletion by author or admin/kierownik
  if (comment.user_id !== userId && !['ADMIN', 'KIEROWNIK'].includes(userRole || '')) {
    return res.status(403).json({
      success: false,
      error: 'Brak uprawnień do usunięcia komentarza'
    });
  }

  await query('DELETE FROM order_comments WHERE id = $1', [commentId]);

  logger.info(`Comment ${commentId} deleted from order ${orderId} by user ${userId}`);

  res.json({
    success: true,
    message: 'Komentarz usunięty'
  });
});
