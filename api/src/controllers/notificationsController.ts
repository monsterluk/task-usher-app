import { Request, Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import nodemailer from 'nodemailer';

// Email transporter configuration
const getEmailTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
};

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

// ============ EMAIL NOTIFICATION SETTINGS ============

// GET /api/notifications/settings
export const getNotificationSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  const result = await query(
    `SELECT * FROM notification_settings WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    // Return defaults
    const userResult = await query('SELECT email FROM workers WHERE id = $1', [userId]);
    return res.json({
      success: true,
      data: {
        email_enabled: true,
        push_enabled: false,
        order_updates: true,
        deadline_reminders: true,
        daily_summary: false,
        reminder_hours_before: 24,
        email: userResult.rows[0]?.email || null
      }
    });
  }

  res.json({
    success: true,
    data: result.rows[0]
  });
});

// PUT /api/notifications/settings
export const updateNotificationSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const {
    email_enabled,
    push_enabled,
    order_updates,
    deadline_reminders,
    daily_summary,
    reminder_hours_before,
    email
  } = req.body;

  const result = await query(`
    INSERT INTO notification_settings (
      user_id, email_enabled, push_enabled, order_updates,
      deadline_reminders, daily_summary, reminder_hours_before, email
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (user_id)
    DO UPDATE SET
      email_enabled = EXCLUDED.email_enabled,
      push_enabled = EXCLUDED.push_enabled,
      order_updates = EXCLUDED.order_updates,
      deadline_reminders = EXCLUDED.deadline_reminders,
      daily_summary = EXCLUDED.daily_summary,
      reminder_hours_before = EXCLUDED.reminder_hours_before,
      email = EXCLUDED.email,
      updated_at = NOW()
    RETURNING *
  `, [userId, email_enabled, push_enabled, order_updates, deadline_reminders, daily_summary, reminder_hours_before, email]);

  res.json({
    success: true,
    data: result.rows[0]
  });
});

// Send email notification
export const sendEmailNotification = async (
  to: string,
  subject: string,
  html: string
) => {
  const transporter = getEmailTransporter();
  if (!transporter) {
    logger.warn('Email not sent - SMTP not configured');
    return false;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'PlexiSystem <noreply@plexisystem.pl>',
      to,
      subject: `[PlexiSystem] ${subject}`,
      html
    });
    logger.info(`Email sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    logger.error('Failed to send email:', error);
    return false;
  }
};

// Create notification with optional email
export const createNotificationWithEmail = async (
  userId: number,
  eventType: string,
  title: string,
  message: string,
  data?: { link?: string; referenceType?: string; referenceId?: number }
) => {
  try {
    // Create in-app notification
    await query(
      `INSERT INTO notifications (user_id, type, category, title, message, link, reference_type, reference_id)
       VALUES ($1, $2, 'system', $3, $4, $5, $6, $7)`,
      [userId, eventType, title, message, data?.link, data?.referenceType, data?.referenceId]
    );

    // Check email settings
    const settings = await query(
      `SELECT ns.*, w.email as worker_email
       FROM notification_settings ns
       JOIN workers w ON w.id = ns.user_id
       WHERE ns.user_id = $1`,
      [userId]
    );

    if (settings.rows.length > 0) {
      const s = settings.rows[0];
      const email = s.email || s.worker_email;

      if (s.email_enabled && email) {
        // Check specific preferences
        if (eventType.includes('order') && !s.order_updates) return;
        if (eventType.includes('deadline') && !s.deadline_reminders) return;

        await sendEmailNotification(
          email,
          title,
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #3b82f6; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">PlexiSystem</h1>
              </div>
              <div style="padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb;">
                <h2 style="color: #1f2937; margin-top: 0;">${title}</h2>
                <p style="color: #4b5563; line-height: 1.6;">${message}</p>
                ${data?.link ? `
                  <a href="${process.env.APP_URL || 'https://plexisystem.example.com'}${data.link}"
                     style="display: inline-block; margin-top: 15px; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">
                    Otwórz w systemie
                  </a>
                ` : ''}
              </div>
              <div style="padding: 15px; text-align: center; color: #9ca3af; font-size: 12px;">
                Ta wiadomość została wygenerowana automatycznie.
              </div>
            </div>
          `
        );
      }
    }
  } catch (error) {
    logger.error('Error creating notification with email:', error);
  }
};

// Send deadline reminders (cron job)
export const sendDeadlineReminders = async () => {
  try {
    logger.info('Running deadline reminders check...');

    // Get users with reminders enabled
    const settings = await query(`
      SELECT ns.*, w.name as user_name, w.role
      FROM notification_settings ns
      JOIN workers w ON w.id = ns.user_id
      WHERE ns.deadline_reminders = true
    `);

    for (const userSettings of settings.rows) {
      const hoursBeforeDeadline = userSettings.reminder_hours_before || 24;
      const reminderTime = new Date();
      reminderTime.setHours(reminderTime.getHours() + hoursBeforeDeadline);

      // Find orders approaching deadline not yet reminded
      const orders = await query(`
        SELECT o.*
        FROM orders o
        WHERE o.status NOT IN ('GOTOWE', 'ANULOWANE')
          AND o.planned_completion_date <= $1
          AND o.planned_completion_date > NOW()
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.reference_type = 'order'
              AND n.reference_id = o.id
              AND n.type = 'deadline_reminder'
              AND n.user_id = $2
              AND n.created_at > NOW() - INTERVAL '${hoursBeforeDeadline} hours'
          )
      `, [reminderTime.toISOString(), userSettings.user_id]);

      for (const order of orders.rows) {
        // Managers get all reminders
        if (userSettings.role === 'KIEROWNIK') {
          const hoursLeft = Math.round(
            (new Date(order.planned_completion_date).getTime() - Date.now()) / (1000 * 60 * 60)
          );

          await createNotificationWithEmail(
            userSettings.user_id,
            'deadline_reminder',
            `Zbliża się termin: ${order.order_number}`,
            `Zlecenie "${order.product_name}" dla ${order.client_name} ma termin za ${hoursLeft} godzin.`,
            { link: `/manager/orders/${order.id}`, referenceType: 'order', referenceId: order.id }
          );
        }
      }
    }

    logger.info('Deadline reminders check completed');
  } catch (error) {
    logger.error('Failed to send deadline reminders:', error);
  }
};

// Send daily summary (cron job)
export const sendDailySummary = async () => {
  try {
    logger.info('Sending daily summaries...');

    const settings = await query(`
      SELECT ns.*, w.name as user_name
      FROM notification_settings ns
      JOIN workers w ON w.id = ns.user_id
      WHERE ns.daily_summary = true AND ns.email_enabled = true
    `);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    for (const userSettings of settings.rows) {
      const email = userSettings.email;
      if (!email) continue;

      // Get summary stats
      const stats = await query(`
        SELECT
          (SELECT COUNT(*) FROM orders WHERE status = 'NOWE') as new_orders,
          (SELECT COUNT(*) FROM orders WHERE status = 'W_TRAKCIE') as in_progress,
          (SELECT COUNT(*) FROM orders WHERE status = 'GOTOWE' AND updated_at >= $1) as completed_today,
          (SELECT COUNT(*) FROM orders WHERE planned_completion_date < NOW() AND status NOT IN ('GOTOWE', 'ANULOWANE')) as overdue,
          (SELECT COUNT(*) FROM orders WHERE planned_completion_date >= $2 AND planned_completion_date < $3) as due_today
      `, [today.toISOString(), today.toISOString(), tomorrow.toISOString()]);

      const s = stats.rows[0];

      await sendEmailNotification(
        email,
        `Podsumowanie dnia - ${today.toLocaleDateString('pl-PL')}`,
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #3b82f6; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">PlexiSystem</h1>
              <p style="margin: 5px 0 0;">Podsumowanie dnia</p>
            </div>
            <div style="padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb;">
              <h2 style="color: #1f2937; margin-top: 0;">Dzień dobry, ${userSettings.user_name}!</h2>

              <div style="display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0;">
                <div style="flex: 1; min-width: 120px; background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center;">
                  <div style="font-size: 28px; font-weight: bold; color: #3b82f6;">${s.new_orders}</div>
                  <div style="color: #6b7280; font-size: 14px;">Nowych</div>
                </div>
                <div style="flex: 1; min-width: 120px; background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center;">
                  <div style="font-size: 28px; font-weight: bold; color: #8b5cf6;">${s.in_progress}</div>
                  <div style="color: #6b7280; font-size: 14px;">W realizacji</div>
                </div>
                <div style="flex: 1; min-width: 120px; background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center;">
                  <div style="font-size: 28px; font-weight: bold; color: #22c55e;">${s.completed_today}</div>
                  <div style="color: #6b7280; font-size: 14px;">Ukończono dziś</div>
                </div>
                <div style="flex: 1; min-width: 120px; background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center;">
                  <div style="font-size: 28px; font-weight: bold; color: ${parseInt(s.overdue) > 0 ? '#ef4444' : '#22c55e'};">${s.overdue}</div>
                  <div style="color: #6b7280; font-size: 14px;">Zaległych</div>
                </div>
              </div>

              ${parseInt(s.due_today) > 0 ? `
                <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                  <strong style="color: #92400e;">${s.due_today} zleceń ma termin dzisiaj!</strong>
                </div>
              ` : ''}

              <a href="${process.env.APP_URL || 'https://plexisystem.example.com'}/manager/dashboard"
                 style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">
                Otwórz dashboard
              </a>
            </div>
            <div style="padding: 15px; text-align: center; color: #9ca3af; font-size: 12px;">
              Wygenerowano automatycznie o ${new Date().toLocaleTimeString('pl-PL')}.
            </div>
          </div>
        `
      );
    }

    logger.info('Daily summaries sent');
  } catch (error) {
    logger.error('Failed to send daily summaries:', error);
  }
};
