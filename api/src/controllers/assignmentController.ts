import { Request, Response } from 'express';
import { query, getClient } from '../config/database';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { updateOrderStatusFromStages } from './stageController';

// ============ RESOURCE CONFLICT VALIDATION ============

interface ConflictCheck {
  hasConflict: boolean;
  conflictType?: 'worker' | 'machine' | 'active_session';
  conflictDetails?: string;
  existingAssignmentId?: number;
  existingOrderNumber?: string;
  existingStageName?: string;
}

// Check if worker has active work session (currently working)
const checkWorkerActiveSession = async (workerId: number): Promise<ConflictCheck> => {
  const result = await query(
    `SELECT ws.id, a.id as assignment_id, s.stage_name, o.order_number
     FROM work_sessions ws
     JOIN assignments a ON ws.assignment_id = a.id
     JOIN stages s ON a.stage_id = s.id
     JOIN orders o ON s.order_id = o.id
     WHERE a.worker_id = $1 AND ws.end_time IS NULL`,
    [workerId]
  );

  if (result.rows.length > 0) {
    const session = result.rows[0];
    return {
      hasConflict: true,
      conflictType: 'active_session',
      conflictDetails: `Pracownik aktualnie pracuje nad: ${session.order_number} - ${session.stage_name}`,
      existingAssignmentId: session.assignment_id,
      existingOrderNumber: session.order_number,
      existingStageName: session.stage_name,
    };
  }

  return { hasConflict: false };
};

// Check for scheduled worker conflicts
const checkWorkerScheduleConflict = async (
  workerId: number,
  scheduledStart?: Date,
  scheduledEnd?: Date,
  excludeAssignmentId?: number
): Promise<ConflictCheck> => {
  if (!scheduledStart || !scheduledEnd) {
    return { hasConflict: false };
  }

  let sql = `
    SELECT a.id, a.scheduled_start, a.scheduled_end, s.stage_name, o.order_number
    FROM assignments a
    JOIN stages s ON a.stage_id = s.id
    JOIN orders o ON s.order_id = o.id
    WHERE a.worker_id = $1
      AND a.scheduled_start IS NOT NULL
      AND a.scheduled_end IS NOT NULL
      AND (
        (a.scheduled_start <= $2 AND a.scheduled_end > $2) OR
        (a.scheduled_start < $3 AND a.scheduled_end >= $3) OR
        (a.scheduled_start >= $2 AND a.scheduled_end <= $3)
      )
      AND a.status != 'GOTOWY'
  `;
  const params: any[] = [workerId, scheduledStart, scheduledEnd];

  if (excludeAssignmentId) {
    sql += ` AND a.id != $4`;
    params.push(excludeAssignmentId);
  }

  const result = await query(sql, params);

  if (result.rows.length > 0) {
    const conflict = result.rows[0];
    return {
      hasConflict: true,
      conflictType: 'worker',
      conflictDetails: `Pracownik ma już zaplanowane: ${conflict.order_number} - ${conflict.stage_name} (${new Date(conflict.scheduled_start).toLocaleString('pl-PL')} - ${new Date(conflict.scheduled_end).toLocaleString('pl-PL')})`,
      existingAssignmentId: conflict.id,
      existingOrderNumber: conflict.order_number,
      existingStageName: conflict.stage_name,
    };
  }

  return { hasConflict: false };
};

// Check for machine conflicts (when stage has assigned machine)
const checkMachineConflict = async (
  machineId: number,
  scheduledStart: Date,
  scheduledEnd: Date,
  excludeStageId?: number
): Promise<ConflictCheck> => {
  let sql = `
    SELECT s.id, s.stage_name, s.scheduled_start, s.scheduled_end, o.order_number, m.name as machine_name
    FROM stages s
    JOIN orders o ON s.order_id = o.id
    JOIN machines m ON s.machine_id = m.id
    WHERE s.machine_id = $1
      AND s.scheduled_start IS NOT NULL
      AND s.scheduled_end IS NOT NULL
      AND (
        (s.scheduled_start <= $2 AND s.scheduled_end > $2) OR
        (s.scheduled_start < $3 AND s.scheduled_end >= $3) OR
        (s.scheduled_start >= $2 AND s.scheduled_end <= $3)
      )
      AND s.status NOT IN ('GOTOWY', 'ANULOWANY')
  `;
  const params: any[] = [machineId, scheduledStart, scheduledEnd];

  if (excludeStageId) {
    sql += ` AND s.id != $4`;
    params.push(excludeStageId);
  }

  const result = await query(sql, params);

  if (result.rows.length > 0) {
    const conflict = result.rows[0];
    return {
      hasConflict: true,
      conflictType: 'machine',
      conflictDetails: `Maszyna ${conflict.machine_name} jest zajęta: ${conflict.order_number} - ${conflict.stage_name} (${new Date(conflict.scheduled_start).toLocaleString('pl-PL')} - ${new Date(conflict.scheduled_end).toLocaleString('pl-PL')})`,
      existingOrderNumber: conflict.order_number,
      existingStageName: conflict.stage_name,
    };
  }

  return { hasConflict: false };
};

// Log resource conflict for audit
const logResourceConflict = async (
  conflictType: 'worker' | 'machine' | 'stage',
  resourceId: number,
  resourceName: string,
  conflictingAssignmentId: number | null,
  conflictingStageId: number | null,
  existingAssignmentId: number | null,
  existingStageId: number | null,
  conflictStart: Date | null,
  conflictEnd: Date | null
) => {
  try {
    await query(
      `INSERT INTO resource_conflicts
       (conflict_type, resource_id, resource_name, conflicting_assignment_id, conflicting_stage_id,
        existing_assignment_id, existing_stage_id, conflict_start, conflict_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [conflictType, resourceId, resourceName, conflictingAssignmentId, conflictingStageId,
       existingAssignmentId, existingStageId, conflictStart, conflictEnd]
    );
  } catch (error) {
    logger.error('Failed to log resource conflict:', error);
  }
};

// POST /api/stages/:stageId/assignments
export const createAssignment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { stageId } = req.params;
  const { worker_id, scheduled_start, scheduled_end, priority, notes, check_conflicts = true, force = false } = req.body;

  if (!worker_id) {
    throw new AppError('Worker ID is required', 400);
  }

  // Check if stage exists
  const stageResult = await query(
    'SELECT s.*, o.id as order_id, o.order_number FROM stages s JOIN orders o ON s.order_id = o.id WHERE s.id = $1',
    [stageId]
  );

  if (stageResult.rows.length === 0) {
    throw new AppError('Stage not found', 404);
  }

  const stage = stageResult.rows[0];

  // Check if worker exists and is active
  const workerResult = await query(
    'SELECT id, name FROM workers WHERE id = $1 AND active = true',
    [worker_id]
  );

  if (workerResult.rows.length === 0) {
    throw new AppError('Worker not found or inactive', 404);
  }

  const worker = workerResult.rows[0];

  // Check if worker is already assigned to this stage
  const existingAssignment = await query(
    'SELECT id FROM assignments WHERE stage_id = $1 AND worker_id = $2',
    [stageId, worker_id]
  );

  if (existingAssignment.rows.length > 0) {
    throw new AppError('Worker is already assigned to this stage', 400);
  }

  // TASK 7: Resource conflict validation
  const conflicts: ConflictCheck[] = [];

  if (check_conflicts) {
    // Check for active work session
    const activeSessionConflict = await checkWorkerActiveSession(worker_id);
    if (activeSessionConflict.hasConflict) {
      conflicts.push(activeSessionConflict);
    }

    // Check for scheduled conflicts if scheduling info provided
    if (scheduled_start && scheduled_end) {
      const scheduleConflict = await checkWorkerScheduleConflict(
        worker_id,
        new Date(scheduled_start),
        new Date(scheduled_end)
      );
      if (scheduleConflict.hasConflict) {
        conflicts.push(scheduleConflict);
      }

      // Check machine conflicts if stage has assigned machine
      if (stage.machine_id) {
        const machineConflict = await checkMachineConflict(
          stage.machine_id,
          new Date(scheduled_start),
          new Date(scheduled_end),
          parseInt(stageId)
        );
        if (machineConflict.hasConflict) {
          conflicts.push(machineConflict);
        }
      }
    }
  }

  // If conflicts found and not forcing, return warning
  if (conflicts.length > 0 && !force) {
    // Log conflicts
    for (const conflict of conflicts) {
      await logResourceConflict(
        conflict.conflictType === 'active_session' ? 'worker' : conflict.conflictType!,
        worker_id,
        worker.name,
        null,
        parseInt(stageId),
        conflict.existingAssignmentId || null,
        null,
        scheduled_start ? new Date(scheduled_start) : null,
        scheduled_end ? new Date(scheduled_end) : null
      );
    }

    return res.status(409).json({
      success: false,
      warning: true,
      message: 'Resource conflicts detected',
      conflicts: conflicts.map(c => ({
        type: c.conflictType,
        details: c.conflictDetails,
        existingOrder: c.existingOrderNumber,
        existingStage: c.existingStageName,
      })),
      hint: 'Use force=true to ignore conflicts and create assignment anyway',
    });
  }

  // Create assignment with optional scheduling
  const result = await query(
    `INSERT INTO assignments (stage_id, worker_id, status, scheduled_start, scheduled_end, priority, notes)
     VALUES ($1, $2, 'NOWY', $3, $4, $5, $6)
     RETURNING *`,
    [stageId, worker_id, scheduled_start || null, scheduled_end || null, priority || 0, notes || null]
  );

  logger.info(
    `Assignment created: Worker ${worker.name} assigned to stage ${stage.stage_name}${conflicts.length > 0 ? ' (with conflicts overridden)' : ''}`
  );

  res.status(201).json({
    success: true,
    data: {
      assignment: {
        ...result.rows[0],
        worker_name: worker.name,
      },
      conflicts_overridden: conflicts.length > 0 ? conflicts.length : undefined,
    },
  });
});

// GET /api/assignments/:id
export const getAssignmentById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const assignmentResult = await query(
    `SELECT
      a.*,
      w.name as worker_name,
      w.position as worker_position,
      w.hourly_rate,
      s.stage_name,
      s.stage_number,
      o.id as order_id,
      o.order_number,
      o.client_name,
      o.product_name
    FROM assignments a
    JOIN workers w ON a.worker_id = w.id
    JOIN stages s ON a.stage_id = s.id
    JOIN orders o ON s.order_id = o.id
    WHERE a.id = $1`,
    [id]
  );

  if (assignmentResult.rows.length === 0) {
    throw new AppError('Assignment not found', 404);
  }

  // Get work sessions
  const sessionsResult = await query(
    'SELECT * FROM work_sessions WHERE assignment_id = $1 ORDER BY start_time DESC',
    [id]
  );

  // Calculate totals
  const totalMinutes = sessionsResult.rows.reduce(
    (sum, s) => sum + (s.duration_minutes || 0),
    0
  );
  const totalCost = sessionsResult.rows.reduce((sum, s) => sum + parseFloat(s.cost || 0), 0);

  res.json({
    success: true,
    data: {
      assignment: assignmentResult.rows[0],
      work_sessions: sessionsResult.rows,
      totals: {
        total_minutes: totalMinutes,
        total_hours: (totalMinutes / 60).toFixed(2),
        total_cost: totalCost.toFixed(2),
      },
    },
  });
});

// PUT /api/assignments/:id
export const updateAssignment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  // Check if assignment exists
  const existingResult = await query(
    `SELECT a.*, s.order_id, s.id as stage_id
     FROM assignments a
     JOIN stages s ON a.stage_id = s.id
     WHERE a.id = $1`,
    [id]
  );

  if (existingResult.rows.length === 0) {
    throw new AppError('Assignment not found', 404);
  }

  const existingAssignment = existingResult.rows[0];

  if (!status) {
    throw new AppError('Status is required', 400);
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Update assignment
    const updateResult = await client.query(
      `UPDATE assignments
       SET status = $1, completed_at = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, status === 'GOTOWY' ? new Date() : null, id]
    );

    // If assignment is completed, check if all assignments in stage are completed
    if (status === 'GOTOWY') {
      const stageAssignments = await client.query(
        'SELECT status FROM assignments WHERE stage_id = $1',
        [existingAssignment.stage_id]
      );

      const allCompleted = stageAssignments.rows.every((a) => a.status === 'GOTOWY');

      if (allCompleted) {
        await client.query(
          `UPDATE stages SET status = 'GOTOWY', updated_at = NOW() WHERE id = $1`,
          [existingAssignment.stage_id]
        );
      }
    } else if (status === 'W_TRAKCIE') {
      // Update stage status to W_TRAKCIE
      await client.query(
        `UPDATE stages SET status = 'W_TRAKCIE', updated_at = NOW() WHERE id = $1 AND status = 'NOWY'`,
        [existingAssignment.stage_id]
      );
    }

    await client.query('COMMIT');

    // Update order status
    await updateOrderStatusFromStages(existingAssignment.order_id);

    logger.info(`Assignment ${id} updated to status ${status}`);

    res.json({
      success: true,
      data: {
        assignment: updateResult.rows[0],
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// DELETE /api/assignments/:id
export const deleteAssignment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Check if assignment exists
  const existingResult = await query('SELECT id FROM assignments WHERE id = $1', [id]);

  if (existingResult.rows.length === 0) {
    throw new AppError('Assignment not found', 404);
  }

  // Delete assignment (cascades to work_sessions)
  await query('DELETE FROM assignments WHERE id = $1', [id]);

  logger.info(`Assignment deleted: ${id}`);

  res.json({
    success: true,
    message: 'Assignment deleted successfully',
  });
});

// GET /api/workers/:workerId/assignments
export const getWorkerAssignments = asyncHandler(async (req: Request, res: Response) => {
  const { workerId } = req.params;
  const { status, active_only } = req.query;

  let sql = `
    SELECT
      a.*,
      s.stage_name,
      s.stage_number,
      o.id as order_id,
      o.order_number,
      o.client_name,
      o.product_name,
      o.planned_completion_date
    FROM assignments a
    JOIN stages s ON a.stage_id = s.id
    JOIN orders o ON s.order_id = o.id
    WHERE a.worker_id = $1
  `;
  const params: any[] = [workerId];
  let paramIndex = 2;

  if (status) {
    sql += ` AND a.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (active_only === 'true') {
    sql += ` AND o.archived = false AND o.status != 'GOTOWE'`;
  }

  sql += ' ORDER BY a.assigned_at DESC';

  const result = await query(sql, params);

  res.json({
    success: true,
    data: {
      assignments: result.rows,
    },
  });
});

// ============ RESOURCE CONFLICT ENDPOINTS ============

// POST /api/assignments/check-conflicts - Check for conflicts before creating assignment
export const checkAssignmentConflicts = asyncHandler(async (req: Request, res: Response) => {
  const { worker_id, stage_id, scheduled_start, scheduled_end } = req.body;

  if (!worker_id) {
    throw new AppError('Worker ID is required', 400);
  }

  const conflicts: ConflictCheck[] = [];

  // Check for active work session
  const activeSessionConflict = await checkWorkerActiveSession(worker_id);
  if (activeSessionConflict.hasConflict) {
    conflicts.push(activeSessionConflict);
  }

  // Check for scheduled conflicts
  if (scheduled_start && scheduled_end) {
    const scheduleConflict = await checkWorkerScheduleConflict(
      worker_id,
      new Date(scheduled_start),
      new Date(scheduled_end)
    );
    if (scheduleConflict.hasConflict) {
      conflicts.push(scheduleConflict);
    }

    // Check machine conflicts if stage has assigned machine
    if (stage_id) {
      const stageResult = await query(
        'SELECT machine_id FROM stages WHERE id = $1',
        [stage_id]
      );
      if (stageResult.rows.length > 0 && stageResult.rows[0].machine_id) {
        const machineConflict = await checkMachineConflict(
          stageResult.rows[0].machine_id,
          new Date(scheduled_start),
          new Date(scheduled_end),
          stage_id
        );
        if (machineConflict.hasConflict) {
          conflicts.push(machineConflict);
        }
      }
    }
  }

  res.json({
    success: true,
    data: {
      has_conflicts: conflicts.length > 0,
      conflicts: conflicts.map(c => ({
        type: c.conflictType,
        details: c.conflictDetails,
        existingOrder: c.existingOrderNumber,
        existingStage: c.existingStageName,
      })),
    },
  });
});

// GET /api/assignments/conflicts - Get logged resource conflicts
export const getResourceConflicts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { conflict_type, resource_id, resolved, limit = 50 } = req.query;

  let sql = `
    SELECT
      rc.*,
      a1.id as conflicting_assignment_id,
      a2.id as existing_assignment_id,
      s1.stage_name as conflicting_stage_name,
      s2.stage_name as existing_stage_name,
      o1.order_number as conflicting_order_number,
      o2.order_number as existing_order_number,
      w.name as resolved_by_name
    FROM resource_conflicts rc
    LEFT JOIN assignments a1 ON rc.conflicting_assignment_id = a1.id
    LEFT JOIN assignments a2 ON rc.existing_assignment_id = a2.id
    LEFT JOIN stages s1 ON rc.conflicting_stage_id = s1.id
    LEFT JOIN stages s2 ON rc.existing_stage_id = s2.id
    LEFT JOIN orders o1 ON s1.order_id = o1.id
    LEFT JOIN orders o2 ON s2.order_id = o2.id
    LEFT JOIN workers w ON rc.resolved_by = w.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (conflict_type) {
    sql += ` AND rc.conflict_type = $${paramIndex}`;
    params.push(conflict_type);
    paramIndex++;
  }

  if (resource_id) {
    sql += ` AND rc.resource_id = $${paramIndex}`;
    params.push(resource_id);
    paramIndex++;
  }

  if (resolved === 'true') {
    sql += ` AND rc.resolution IS NOT NULL`;
  } else if (resolved === 'false') {
    sql += ` AND rc.resolution IS NULL`;
  }

  sql += ` ORDER BY rc.created_at DESC LIMIT $${paramIndex}`;
  params.push(limit);

  const result = await query(sql, params);

  res.json({
    success: true,
    data: {
      conflicts: result.rows,
      total: result.rows.length,
    },
  });
});

// PUT /api/assignments/conflicts/:id/resolve - Resolve a conflict
export const resolveResourceConflict = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { resolution } = req.body;
  const userId = req.user?.id;

  if (!resolution || !['ignored', 'rescheduled', 'cancelled', 'auto_resolved'].includes(resolution)) {
    throw new AppError('Valid resolution is required (ignored, rescheduled, cancelled, auto_resolved)', 400);
  }

  // Get worker ID for the user
  const workerResult = await query('SELECT id FROM workers WHERE user_id = $1', [userId]);
  const workerId = workerResult.rows.length > 0 ? workerResult.rows[0].id : null;

  const result = await query(
    `UPDATE resource_conflicts
     SET resolution = $1, resolved_by = $2, resolved_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [resolution, workerId, id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Conflict not found', 404);
  }

  logger.info(`Resource conflict ${id} resolved as ${resolution}`);

  res.json({
    success: true,
    data: {
      conflict: result.rows[0],
    },
  });
});

// GET /api/workers/:workerId/availability - Check worker availability
export const checkWorkerAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { workerId } = req.params;
  const { date, start_time, end_time } = req.query;

  // Check if worker has active session
  const activeSession = await checkWorkerActiveSession(parseInt(workerId));

  // Get scheduled assignments for the date range
  let scheduledSql = `
    SELECT
      a.id,
      a.scheduled_start,
      a.scheduled_end,
      a.status,
      s.stage_name,
      o.order_number
    FROM assignments a
    JOIN stages s ON a.stage_id = s.id
    JOIN orders o ON s.order_id = o.id
    WHERE a.worker_id = $1
      AND a.status != 'GOTOWY'
  `;
  const params: any[] = [workerId];

  if (date) {
    scheduledSql += ` AND DATE(a.scheduled_start) = $2`;
    params.push(date);
  } else if (start_time && end_time) {
    scheduledSql += ` AND a.scheduled_start >= $2 AND a.scheduled_end <= $3`;
    params.push(start_time, end_time);
  }

  scheduledSql += ' ORDER BY a.scheduled_start';

  const scheduledResult = await query(scheduledSql, params);

  res.json({
    success: true,
    data: {
      worker_id: workerId,
      is_currently_working: activeSession.hasConflict,
      current_work: activeSession.hasConflict ? {
        order: activeSession.existingOrderNumber,
        stage: activeSession.existingStageName,
      } : null,
      scheduled_assignments: scheduledResult.rows,
    },
  });
});
