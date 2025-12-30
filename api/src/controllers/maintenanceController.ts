import { Request, Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { logAudit, getAuditContextFromRequest } from '../services/auditService';
import { notifyMaintenanceDue } from './notificationsController';

// ============ MAINTENANCE SCHEDULES ============

// GET /api/maintenance/schedules
export const getSchedules = asyncHandler(async (req: Request, res: Response) => {
  const { machine_id, status, maintenance_type, upcoming_days } = req.query;

  let sql = `
    SELECT ms.*,
           m.name as machine_name, m.department,
           w.name as assigned_to_name
    FROM maintenance_schedules ms
    JOIN machines m ON ms.machine_id = m.id
    LEFT JOIN workers w ON ms.assigned_to = w.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (machine_id) {
    sql += ` AND ms.machine_id = $${paramIndex}`;
    params.push(machine_id);
    paramIndex++;
  }

  if (status) {
    sql += ` AND ms.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (maintenance_type) {
    sql += ` AND ms.maintenance_type = $${paramIndex}`;
    params.push(maintenance_type);
    paramIndex++;
  }

  if (upcoming_days) {
    sql += ` AND ms.next_due_at <= NOW() + INTERVAL '${parseInt(upcoming_days as string)} days'`;
    sql += ` AND ms.status != 'completed' AND ms.status != 'cancelled'`;
  }

  sql += ` ORDER BY ms.next_due_at ASC`;

  const result = await query(sql, params);

  // Get summary stats
  const statsResult = await query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE status = 'overdue') as overdue,
      COUNT(*) FILTER (WHERE next_due_at <= NOW() AND status NOT IN ('completed', 'cancelled')) as due_now
    FROM maintenance_schedules
  `);

  res.json({
    success: true,
    data: {
      schedules: result.rows,
      stats: statsResult.rows[0],
    },
  });
});

// GET /api/maintenance/schedules/:id
export const getScheduleById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await query(
    `SELECT ms.*,
            m.name as machine_name, m.department,
            w.name as assigned_to_name
     FROM maintenance_schedules ms
     JOIN machines m ON ms.machine_id = m.id
     LEFT JOIN workers w ON ms.assigned_to = w.id
     WHERE ms.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Harmonogram nie znaleziony', 404);
  }

  // Get related logs
  const logsResult = await query(
    `SELECT ml.*, w.name as performed_by_name
     FROM maintenance_logs ml
     LEFT JOIN workers w ON ml.performed_by = w.id
     WHERE ml.schedule_id = $1
     ORDER BY ml.completed_at DESC`,
    [id]
  );

  res.json({
    success: true,
    data: {
      schedule: result.rows[0],
      logs: logsResult.rows,
    },
  });
});

// POST /api/maintenance/schedules
export const createSchedule = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    machine_id,
    maintenance_type,
    title,
    description,
    frequency_days,
    next_due_at,
    estimated_duration_hours,
    assigned_to,
    priority,
    checklist,
    notes,
  } = req.body;

  if (!machine_id || !title) {
    throw new AppError('machine_id i title są wymagane', 400);
  }

  // Verify machine exists
  const machineResult = await query('SELECT id, name FROM machines WHERE id = $1', [machine_id]);
  if (machineResult.rows.length === 0) {
    throw new AppError('Maszyna nie znaleziona', 404);
  }

  const result = await query(
    `INSERT INTO maintenance_schedules
     (machine_id, maintenance_type, title, description, frequency_days, next_due_at, estimated_duration_hours, assigned_to, priority, checklist, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      machine_id,
      maintenance_type || 'preventive',
      title,
      description,
      frequency_days,
      next_due_at || new Date(),
      estimated_duration_hours,
      assigned_to,
      priority || 'normal',
      checklist ? JSON.stringify(checklist) : null,
      notes,
    ]
  );

  const schedule = result.rows[0];

  await logAudit({
    tableName: 'maintenance_schedules',
    recordId: schedule.id,
    action: 'CREATE',
    newValues: schedule,
    context: getAuditContextFromRequest(req),
  });

  logger.info(`Maintenance schedule created: ${title} for machine ${machineResult.rows[0].name}`);

  res.status(201).json({
    success: true,
    data: { schedule },
  });
});

// PUT /api/maintenance/schedules/:id
export const updateSchedule = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const existingResult = await query('SELECT * FROM maintenance_schedules WHERE id = $1', [id]);
  if (existingResult.rows.length === 0) {
    throw new AppError('Harmonogram nie znaleziony', 404);
  }

  const allowedFields = [
    'maintenance_type', 'title', 'description', 'frequency_days', 'next_due_at',
    'estimated_duration_hours', 'assigned_to', 'priority', 'status', 'checklist', 'notes'
  ];

  const setClauses: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key) && value !== undefined) {
      setClauses.push(`${key} = $${paramIndex}`);
      params.push(key === 'checklist' ? JSON.stringify(value) : value);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) {
    throw new AppError('Brak pól do aktualizacji', 400);
  }

  setClauses.push(`updated_at = NOW()`);
  params.push(id);

  const sql = `UPDATE maintenance_schedules SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
  const result = await query(sql, params);

  await logAudit({
    tableName: 'maintenance_schedules',
    recordId: Number(id),
    action: 'UPDATE',
    oldValues: existingResult.rows[0],
    newValues: result.rows[0],
    context: getAuditContextFromRequest(req),
  });

  res.json({
    success: true,
    data: { schedule: result.rows[0] },
  });
});

// DELETE /api/maintenance/schedules/:id
export const deleteSchedule = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const existingResult = await query('SELECT * FROM maintenance_schedules WHERE id = $1', [id]);
  if (existingResult.rows.length === 0) {
    throw new AppError('Harmonogram nie znaleziony', 404);
  }

  await logAudit({
    tableName: 'maintenance_schedules',
    recordId: Number(id),
    action: 'DELETE',
    oldValues: existingResult.rows[0],
    context: getAuditContextFromRequest(req),
  });

  await query('DELETE FROM maintenance_schedules WHERE id = $1', [id]);

  res.json({
    success: true,
    message: 'Harmonogram usunięty',
  });
});

// POST /api/maintenance/schedules/:id/start
export const startMaintenance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const scheduleResult = await query(
    `SELECT ms.*, m.name as machine_name
     FROM maintenance_schedules ms
     JOIN machines m ON ms.machine_id = m.id
     WHERE ms.id = $1`,
    [id]
  );

  if (scheduleResult.rows.length === 0) {
    throw new AppError('Harmonogram nie znaleziony', 404);
  }

  const schedule = scheduleResult.rows[0];

  // Update schedule status
  await query(
    `UPDATE maintenance_schedules SET status = 'in_progress', updated_at = NOW() WHERE id = $1`,
    [id]
  );

  // Update machine status to maintenance
  await query(
    `UPDATE machines SET status = 'maintenance', updated_at = NOW() WHERE id = $1`,
    [schedule.machine_id]
  );

  // Create maintenance log entry
  const logResult = await query(
    `INSERT INTO maintenance_logs
     (schedule_id, machine_id, performed_by, maintenance_type, title, started_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING *`,
    [id, schedule.machine_id, req.user?.id, schedule.maintenance_type, schedule.title]
  );

  logger.info(`Maintenance started: ${schedule.title} on ${schedule.machine_name}`);

  res.json({
    success: true,
    data: {
      schedule: { ...schedule, status: 'in_progress' },
      log: logResult.rows[0],
    },
  });
});

// POST /api/maintenance/schedules/:id/complete
export const completeMaintenance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { duration_hours, findings, actions_taken, parts_used, cost } = req.body;

  const scheduleResult = await query(
    `SELECT ms.*, m.name as machine_name
     FROM maintenance_schedules ms
     JOIN machines m ON ms.machine_id = m.id
     WHERE ms.id = $1`,
    [id]
  );

  if (scheduleResult.rows.length === 0) {
    throw new AppError('Harmonogram nie znaleziony', 404);
  }

  const schedule = scheduleResult.rows[0];

  // Calculate next due date based on frequency
  let nextDueAt = null;
  if (schedule.frequency_days) {
    nextDueAt = new Date();
    nextDueAt.setDate(nextDueAt.getDate() + schedule.frequency_days);
  }

  // Update schedule
  await query(
    `UPDATE maintenance_schedules
     SET status = 'scheduled',
         last_performed_at = NOW(),
         next_due_at = $2,
         updated_at = NOW()
     WHERE id = $1`,
    [id, nextDueAt]
  );

  // Update machine status back to available
  await query(
    `UPDATE machines SET status = 'available', updated_at = NOW() WHERE id = $1`,
    [schedule.machine_id]
  );

  // Update maintenance log
  await query(
    `UPDATE maintenance_logs
     SET completed_at = NOW(),
         duration_hours = $2,
         findings = $3,
         actions_taken = $4,
         parts_used = $5,
         cost = $6
     WHERE schedule_id = $1 AND completed_at IS NULL`,
    [id, duration_hours, findings, actions_taken, parts_used ? JSON.stringify(parts_used) : null, cost]
  );

  logger.info(`Maintenance completed: ${schedule.title} on ${schedule.machine_name}`);

  res.json({
    success: true,
    message: 'Konserwacja zakończona',
    data: {
      next_due_at: nextDueAt,
    },
  });
});

// ============ MAINTENANCE LOGS ============

// GET /api/maintenance/logs
export const getLogs = asyncHandler(async (req: Request, res: Response) => {
  const { machine_id, limit = 50, offset = 0 } = req.query;

  let sql = `
    SELECT ml.*,
           m.name as machine_name,
           w.name as performed_by_name
    FROM maintenance_logs ml
    JOIN machines m ON ml.machine_id = m.id
    LEFT JOIN workers w ON ml.performed_by = w.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (machine_id) {
    sql += ` AND ml.machine_id = $${paramIndex}`;
    params.push(machine_id);
    paramIndex++;
  }

  sql += ` ORDER BY ml.completed_at DESC NULLS FIRST LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await query(sql, params);

  res.json({
    success: true,
    data: { logs: result.rows },
  });
});

// GET /api/maintenance/stats
export const getMaintenanceStats = asyncHandler(async (req: Request, res: Response) => {
  const { from_date, to_date } = req.query;

  // Overall stats
  const statsResult = await query(`
    SELECT
      COUNT(*) as total_performed,
      COALESCE(SUM(cost), 0) as total_cost,
      COALESCE(AVG(duration_hours), 0) as avg_duration,
      COUNT(*) FILTER (WHERE maintenance_type = 'preventive') as preventive,
      COUNT(*) FILTER (WHERE maintenance_type = 'corrective') as corrective
    FROM maintenance_logs
    WHERE completed_at IS NOT NULL
      AND ($1::date IS NULL OR completed_at >= $1::date)
      AND ($2::date IS NULL OR completed_at <= $2::date)
  `, [from_date || null, to_date || null]);

  // Upcoming maintenance
  const upcomingResult = await query(`
    SELECT COUNT(*) as count
    FROM maintenance_schedules
    WHERE next_due_at <= NOW() + INTERVAL '7 days'
      AND status NOT IN ('completed', 'cancelled')
  `);

  // Overdue
  const overdueResult = await query(`
    SELECT COUNT(*) as count
    FROM maintenance_schedules
    WHERE next_due_at < NOW()
      AND status NOT IN ('completed', 'cancelled', 'in_progress')
  `);

  // By machine (top 5)
  const byMachineResult = await query(`
    SELECT m.name, COUNT(*) as count, COALESCE(SUM(ml.cost), 0) as total_cost
    FROM maintenance_logs ml
    JOIN machines m ON ml.machine_id = m.id
    WHERE ml.completed_at IS NOT NULL
      AND ($1::date IS NULL OR ml.completed_at >= $1::date)
      AND ($2::date IS NULL OR ml.completed_at <= $2::date)
    GROUP BY m.id, m.name
    ORDER BY count DESC
    LIMIT 5
  `, [from_date || null, to_date || null]);

  res.json({
    success: true,
    data: {
      stats: statsResult.rows[0],
      upcoming: parseInt(upcomingResult.rows[0].count),
      overdue: parseInt(overdueResult.rows[0].count),
      by_machine: byMachineResult.rows,
    },
  });
});

// Check for overdue maintenance and send notifications
export const checkOverdueMaintenance = async () => {
  try {
    // Find overdue schedules
    const overdueResult = await query(`
      UPDATE maintenance_schedules
      SET status = 'overdue'
      WHERE next_due_at < NOW()
        AND status = 'scheduled'
      RETURNING id, machine_id, title
    `);

    // Send notifications for newly overdue
    for (const schedule of overdueResult.rows) {
      const machineResult = await query('SELECT name FROM machines WHERE id = $1', [schedule.machine_id]);
      if (machineResult.rows.length > 0) {
        await notifyMaintenanceDue(schedule.machine_id, machineResult.rows[0].name, schedule.title);
      }
    }

    logger.info(`Checked overdue maintenance: ${overdueResult.rows.length} schedules marked as overdue`);
  } catch (error) {
    logger.error('Error checking overdue maintenance:', error);
  }
};
