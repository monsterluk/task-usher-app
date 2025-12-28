import { Request, Response } from 'express';
import { query, getClient } from '../config/database';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { updateOrderStatusFromStages } from './stageController';

// POST /api/stages/:stageId/assignments
export const createAssignment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { stageId } = req.params;
  const { worker_id } = req.body;

  if (!worker_id) {
    throw new AppError('Worker ID is required', 400);
  }

  // Check if stage exists
  const stageResult = await query(
    'SELECT s.*, o.id as order_id FROM stages s JOIN orders o ON s.order_id = o.id WHERE s.id = $1',
    [stageId]
  );

  if (stageResult.rows.length === 0) {
    throw new AppError('Stage not found', 404);
  }

  // Check if worker exists and is active
  const workerResult = await query(
    'SELECT id, name FROM workers WHERE id = $1 AND active = true',
    [worker_id]
  );

  if (workerResult.rows.length === 0) {
    throw new AppError('Worker not found or inactive', 404);
  }

  // Check if worker is already assigned to this stage
  const existingAssignment = await query(
    'SELECT id FROM assignments WHERE stage_id = $1 AND worker_id = $2',
    [stageId, worker_id]
  );

  if (existingAssignment.rows.length > 0) {
    throw new AppError('Worker is already assigned to this stage', 400);
  }

  const result = await query(
    `INSERT INTO assignments (stage_id, worker_id, status)
     VALUES ($1, $2, 'NOWY')
     RETURNING *`,
    [stageId, worker_id]
  );

  logger.info(
    `Assignment created: Worker ${workerResult.rows[0].name} assigned to stage ${stageResult.rows[0].stage_name}`
  );

  res.status(201).json({
    success: true,
    data: {
      assignment: {
        ...result.rows[0],
        worker_name: workerResult.rows[0].name,
      },
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
