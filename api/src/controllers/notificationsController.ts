import { Request, Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';

// GET /api/notifications
export const getNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { unread_only, category, limit = 50, offset = 0 } = req.query;

  let sql = `
    SELECT * FROM notifications
    WHERE user_id = $1
  `;
  const params: any[] = [userId];
  let paramIndex = 2;

  if (unread_only === 'true') {
    sql += ` AND is_read = false`;
  }

  if (category) {
    sql += ` AND category = $${paramIndex}`;
    params.push(category);
    paramIndex++;
  }

  // Exclude expired notifications
  sql += ` AND (expires_at IS NULL OR expires_at > NOW())`;

  sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await query(sql, params);

  // Get unread count
  const countResult = await query(
    `SELECT COUNT(*) as count FROM notifications
     WHERE user_id = $1 AND is_read = false
     AND (expires_at IS NULL OR expires_at > NOW())`,
    [userId]
  );

  res.json({
    success: true,
    data: {
      notifications: result.rows,
      unread_count: parseInt(countResult.rows[0].count),
    },
  });
});

// POST /api/notifications/mark-read
export const markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { notification_ids, mark_all } = req.body;

  if (mark_all) {
    await query(
      `UPDATE notifications SET is_read = true, read_at = NOW()
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
  } else if (notification_ids && notification_ids.length > 0) {
    await query(
      `UPDATE notifications SET is_read = true, read_at = NOW()
       WHERE user_id = $1 AND id = ANY($2)`,
      [userId, notification_ids]
    );
  } else {
    throw new AppError('Podaj notification_ids lub mark_all=true', 400);
  }

  res.json({
    success: true,
    message: 'Powiadomienia oznaczone jako przeczytane',
  });
});

// DELETE /api/notifications/:id
export const deleteNotification = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { id } = req.params;

  const result = await query(
    `DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Powiadomienie nie znalezione', 404);
  }

  res.json({
    success: true,
    message: 'Powiadomienie usunięte',
  });
});

// POST /api/notifications (internal - create notification)
export const createNotification = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { user_id, type, category, priority, title, message, link, reference_type, reference_id, expires_at } = req.body;

  if (!user_id || !type || !title) {
    throw new AppError('user_id, type i title są wymagane', 400);
  }

  const result = await query(
    `INSERT INTO notifications (user_id, type, category, priority, title, message, link, reference_type, reference_id, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [user_id, type, category || 'system', priority || 'normal', title, message, link, reference_type, reference_id, expires_at]
  );

  res.status(201).json({
    success: true,
    data: { notification: result.rows[0] },
  });
});

// POST /api/notifications/broadcast (send to multiple users or roles)
export const broadcastNotification = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { user_ids, role, type, category, priority, title, message, link, reference_type, reference_id, expires_at } = req.body;

  if (!type || !title) {
    throw new AppError('type i title są wymagane', 400);
  }

  let targetUserIds: number[] = [];

  if (user_ids && user_ids.length > 0) {
    targetUserIds = user_ids;
  } else if (role) {
    // Get all users with the specified role
    const usersResult = await query('SELECT id FROM workers WHERE role = $1 AND active = true', [role]);
    targetUserIds = usersResult.rows.map((r: any) => r.id);
  } else {
    // Send to all active managers
    const usersResult = await query('SELECT id FROM workers WHERE role = $1 AND active = true', ['KIEROWNIK']);
    targetUserIds = usersResult.rows.map((r: any) => r.id);
  }

  if (targetUserIds.length === 0) {
    throw new AppError('Brak odbiorców dla powiadomienia', 400);
  }

  // Insert notifications for all target users
  const values = targetUserIds.map((uid, i) =>
    `($${i * 10 + 1}, $${i * 10 + 2}, $${i * 10 + 3}, $${i * 10 + 4}, $${i * 10 + 5}, $${i * 10 + 6}, $${i * 10 + 7}, $${i * 10 + 8}, $${i * 10 + 9}, $${i * 10 + 10})`
  ).join(', ');

  const params: any[] = [];
  targetUserIds.forEach(uid => {
    params.push(uid, type, category || 'system', priority || 'normal', title, message, link, reference_type, reference_id, expires_at);
  });

  await query(
    `INSERT INTO notifications (user_id, type, category, priority, title, message, link, reference_type, reference_id, expires_at)
     VALUES ${values}`,
    params
  );

  logger.info(`Broadcast notification sent to ${targetUserIds.length} users: ${title}`);

  res.status(201).json({
    success: true,
    message: `Powiadomienie wysłane do ${targetUserIds.length} użytkowników`,
  });
});

// ============ NOTIFICATION SERVICE FUNCTIONS (for internal use) ============

// Create notification for a specific event
export const notifyEvent = async (
  eventType: string,
  data: {
    userId?: number;
    role?: string;
    title: string;
    message?: string;
    category?: string;
    priority?: string;
    link?: string;
    referenceType?: string;
    referenceId?: number;
  }
) => {
  try {
    let targetUserIds: number[] = [];

    if (data.userId) {
      targetUserIds = [data.userId];
    } else if (data.role) {
      const usersResult = await query('SELECT id FROM workers WHERE role = $1 AND active = true', [data.role]);
      targetUserIds = usersResult.rows.map((r: any) => r.id);
    } else {
      // Default to managers
      const usersResult = await query('SELECT id FROM workers WHERE role = $1 AND active = true', ['KIEROWNIK']);
      targetUserIds = usersResult.rows.map((r: any) => r.id);
    }

    for (const uid of targetUserIds) {
      await query(
        `INSERT INTO notifications (user_id, type, category, priority, title, message, link, reference_type, reference_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          uid,
          eventType,
          data.category || 'system',
          data.priority || 'normal',
          data.title,
          data.message,
          data.link,
          data.referenceType,
          data.referenceId,
        ]
      );
    }

    logger.info(`Notification created for event ${eventType}: ${data.title}`);
  } catch (error) {
    logger.error('Error creating notification:', error);
  }
};

// Predefined notification helpers
export const notifyOrderOverdue = async (orderId: number, orderNumber: string) => {
  await notifyEvent('order_overdue', {
    role: 'KIEROWNIK',
    title: `Zlecenie ${orderNumber} po terminie`,
    message: `Zlecenie ${orderNumber} przekroczyło planowany termin realizacji.`,
    category: 'order',
    priority: 'high',
    link: `/manager/orders/${orderId}`,
    referenceType: 'order',
    referenceId: orderId,
  });
};

export const notifyQualityIssue = async (orderId: number, orderNumber: string, severity: string) => {
  const priority = severity === 'critical' ? 'urgent' : severity === 'major' ? 'high' : 'normal';
  await notifyEvent('quality_issue', {
    role: 'KIEROWNIK',
    title: `Problem jakości - ${orderNumber}`,
    message: `Zgłoszono wadę o wadze: ${severity}`,
    category: 'quality',
    priority,
    link: `/manager/orders/${orderId}`,
    referenceType: 'order',
    referenceId: orderId,
  });
};

export const notifyMaintenanceDue = async (machineId: number, machineName: string, maintenanceTitle: string) => {
  await notifyEvent('maintenance_due', {
    role: 'KIEROWNIK',
    title: `Konserwacja: ${machineName}`,
    message: `Nadchodzi termin konserwacji: ${maintenanceTitle}`,
    category: 'maintenance',
    priority: 'normal',
    link: `/manager/machines`,
    referenceType: 'machine',
    referenceId: machineId,
  });
};

export const notifyMachineDown = async (machineId: number, machineName: string) => {
  await notifyEvent('machine_down', {
    role: 'KIEROWNIK',
    title: `Awaria: ${machineName}`,
    message: `Maszyna ${machineName} została oznaczona jako offline/awaria.`,
    category: 'machine',
    priority: 'urgent',
    link: `/manager/machines`,
    referenceType: 'machine',
    referenceId: machineId,
  });
};
