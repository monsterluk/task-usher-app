import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { AuthRequest } from '../types';

// Google Calendar integration controller
// For production, you would use googleapis package

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  allDay: boolean;
  type: 'order' | 'maintenance' | 'meeting' | 'deadline';
  orderId?: number;
  color?: string;
  status?: string;
}

// Get calendar events for a date range
export const getCalendarEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end, types } = req.query;
    const startDate = start ? new Date(start as string) : new Date();
    const endDate = end ? new Date(end as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const events: CalendarEvent[] = [];

    // Get orders as events (deadlines)
    const ordersResult = await pool.query(`
      SELECT id, order_number, product_name, client_name,
             planned_completion_date, status, priority
      FROM orders
      WHERE planned_completion_date BETWEEN $1 AND $2
        AND archived = false
      ORDER BY planned_completion_date ASC
    `, [startDate, endDate]);

    ordersResult.rows.forEach(order => {
      events.push({
        id: `order-${order.id}`,
        title: `${order.order_number}: ${order.product_name}`,
        description: `Klient: ${order.client_name}\nStatus: ${order.status}`,
        start: order.planned_completion_date,
        end: order.planned_completion_date,
        allDay: true,
        type: 'deadline',
        orderId: order.id,
        color: getOrderColor(order.priority, order.status),
        status: order.status
      });
    });

    // Get maintenance schedules as events
    const maintenanceResult = await pool.query(`
      SELECT ms.id, ms.scheduled_date, ms.description, ms.status,
             m.name as machine_name
      FROM maintenance_schedules ms
      JOIN machines m ON ms.machine_id = m.id
      WHERE ms.scheduled_date BETWEEN $1 AND $2
      ORDER BY ms.scheduled_date ASC
    `, [startDate, endDate]);

    maintenanceResult.rows.forEach(maint => {
      events.push({
        id: `maint-${maint.id}`,
        title: `Konserwacja: ${maint.machine_name}`,
        description: maint.description,
        start: maint.scheduled_date,
        end: maint.scheduled_date,
        allDay: true,
        type: 'maintenance',
        color: maint.status === 'completed' ? '#10b981' : '#f59e0b',
        status: maint.status
      });
    });

    // Filter by types if specified
    let filteredEvents = events;
    if (types) {
      const typeList = (types as string).split(',');
      filteredEvents = events.filter(e => typeList.includes(e.type));
    }

    res.json({
      success: true,
      data: filteredEvents,
      count: filteredEvents.length
    });
  } catch (error) {
    logger.error('Error fetching calendar events:', error);
    next(error);
  }
};

// Create calendar event
export const createCalendarEvent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, description, start, end, type, orderId } = req.body;

    // For now, we store custom events in a simple table
    // In production, this would sync with Google Calendar API
    const result = await pool.query(`
      INSERT INTO calendar_events (title, description, start_date, end_date, event_type, order_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [title, description, start, end, type, orderId, req.user?.id]);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Wydarzenie utworzone'
    });
  } catch (error) {
    logger.error('Error creating calendar event:', error);
    next(error);
  }
};

// Update calendar event
export const updateCalendarEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, description, start, end } = req.body;

    const result = await pool.query(`
      UPDATE calendar_events
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          start_date = COALESCE($3, start_date),
          end_date = COALESCE($4, end_date),
          updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [title, description, start, end, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wydarzenie nie znalezione' });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Wydarzenie zaktualizowane'
    });
  } catch (error) {
    logger.error('Error updating calendar event:', error);
    next(error);
  }
};

// Delete calendar event
export const deleteCalendarEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      DELETE FROM calendar_events WHERE id = $1 RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wydarzenie nie znalezione' });
    }

    res.json({
      success: true,
      message: 'Wydarzenie usuniete'
    });
  } catch (error) {
    logger.error('Error deleting calendar event:', error);
    next(error);
  }
};

// Get production schedule (Gantt-like view)
export const getProductionSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = req.query;
    const startDate = start ? new Date(start as string) : new Date();
    const endDate = end ? new Date(end as string) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const result = await pool.query(`
      SELECT
        o.id, o.order_number, o.product_name, o.client_name,
        o.planned_start_date, o.planned_completion_date, o.status, o.priority,
        o.quantity, o.unit,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', s.id,
            'name', s.name,
            'status', s.status,
            'order_index', s.order_index
          ) ORDER BY s.order_index)
          FROM stages s WHERE s.order_id = o.id),
          '[]'
        ) as stages
      FROM orders o
      WHERE (o.planned_start_date BETWEEN $1 AND $2
         OR o.planned_completion_date BETWEEN $1 AND $2
         OR (o.planned_start_date <= $1 AND o.planned_completion_date >= $2))
        AND o.archived = false
        AND o.status != 'GOTOWE'
      ORDER BY o.planned_start_date ASC, o.priority DESC
    `, [startDate, endDate]);

    res.json({
      success: true,
      data: result.rows,
      period: { start: startDate, end: endDate }
    });
  } catch (error) {
    logger.error('Error fetching production schedule:', error);
    next(error);
  }
};

// Get worker schedule
export const getWorkerSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workerId } = req.params;
    const { start, end } = req.query;
    const startDate = start ? new Date(start as string) : new Date();
    const endDate = end ? new Date(end as string) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const result = await pool.query(`
      SELECT
        s.id as stage_id, s.name as stage_name, s.status as stage_status,
        o.id as order_id, o.order_number, o.product_name, o.client_name,
        o.planned_completion_date,
        sa.assigned_at
      FROM stage_assignments sa
      JOIN stages s ON sa.stage_id = s.id
      JOIN orders o ON s.order_id = o.id
      WHERE sa.worker_id = $1
        AND o.planned_completion_date BETWEEN $2 AND $3
        AND s.status != 'completed'
        AND o.archived = false
      ORDER BY o.planned_completion_date ASC, s.order_index ASC
    `, [workerId, startDate, endDate]);

    res.json({
      success: true,
      data: result.rows,
      workerId: parseInt(workerId)
    });
  } catch (error) {
    logger.error('Error fetching worker schedule:', error);
    next(error);
  }
};

// Sync with Google Calendar (placeholder for OAuth implementation)
export const syncGoogleCalendar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // This would use googleapis package in production:
    // 1. Check if user has connected Google Calendar
    // 2. Get access token from stored credentials
    // 3. Fetch events from Google Calendar API
    // 4. Merge with local events

    res.json({
      success: true,
      message: 'Synchronizacja z Google Calendar wymaga konfiguracji OAuth. Skontaktuj sie z administratorem.',
      setupRequired: true,
      instructions: [
        '1. Utworz projekt w Google Cloud Console',
        '2. Wlacz Calendar API',
        '3. Skonfiguruj ekran zgody OAuth',
        '4. Utworz dane uwierzytelniajace OAuth 2.0',
        '5. Dodaj GOOGLE_CLIENT_ID i GOOGLE_CLIENT_SECRET do .env'
      ]
    });
  } catch (error) {
    logger.error('Error syncing with Google Calendar:', error);
    next(error);
  }
};

// Helper function to get color based on priority and status
function getOrderColor(priority: string, status: string): string {
  if (status === 'GOTOWE') return '#10b981'; // green
  if (status === 'WSTRZYMANE') return '#6b7280'; // gray

  switch (priority) {
    case 'KRYTYCZNY': return '#ef4444'; // red
    case 'WYSOKI': return '#f97316'; // orange
    case 'NORMALNY': return '#3b82f6'; // blue
    case 'NISKI': return '#6b7280'; // gray
    default: return '#3b82f6'; // blue
  }
}
