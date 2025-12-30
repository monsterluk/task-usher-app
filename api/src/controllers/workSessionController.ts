import { Request, Response } from 'express';
import { query, getClient } from '../config/database';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { updateOrderStatusFromStages } from './stageController';

// POST /api/assignments/:assignmentId/start
export const startTimer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { assignmentId } = req.params;
  const { auto_close_previous = false } = req.body;

  // Check if assignment exists
  const assignmentResult = await query(
    `SELECT a.*, s.order_id, s.id as stage_id, w.hourly_rate, w.id as worker_id
     FROM assignments a
     JOIN stages s ON a.stage_id = s.id
     JOIN workers w ON a.worker_id = w.id
     WHERE a.id = $1`,
    [assignmentId]
  );

  if (assignmentResult.rows.length === 0) {
    throw new AppError('Assignment not found', 404);
  }

  const assignment = assignmentResult.rows[0];
  const workerId = assignment.worker_id;

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // TASK 1.1: Check if worker has ANY active session (SELECT FOR UPDATE to prevent race condition)
    const activeWorkerSession = await client.query(
      `SELECT ws.id, ws.assignment_id, a.id as asgn_id, s.stage_name, o.order_number
       FROM work_sessions ws
       JOIN assignments a ON ws.assignment_id = a.id
       JOIN stages s ON a.stage_id = s.id
       JOIN orders o ON s.order_id = o.id
       WHERE a.worker_id = $1 AND ws.end_time IS NULL
       FOR UPDATE`,
      [workerId]
    );

    if (activeWorkerSession.rows.length > 0) {
      const existingSession = activeWorkerSession.rows[0];

      if (auto_close_previous) {
        // Automatically close the previous session
        const hourlyRateResult = await client.query(
          `SELECT w.hourly_rate FROM workers w
           JOIN assignments a ON a.worker_id = w.id
           WHERE a.id = $1`,
          [existingSession.assignment_id]
        );
        const prevHourlyRate = parseFloat(hourlyRateResult.rows[0]?.hourly_rate || 0);

        await client.query(
          `UPDATE work_sessions
           SET end_time = NOW(),
               duration_minutes = EXTRACT(EPOCH FROM (NOW() - start_time)) / 60,
               cost = (EXTRACT(EPOCH FROM (NOW() - start_time)) / 3600) * $1,
               updated_at = NOW()
           WHERE id = $2`,
          [prevHourlyRate, existingSession.id]
        );

        logger.info(`Auto-closed previous session ${existingSession.id} for worker ${workerId}`);
      } else {
        // Return error with info about existing session
        await client.query('ROLLBACK');
        throw new AppError(
          `Pracownik ma już aktywną sesję pracy (zlecenie: ${existingSession.order_number}, etap: ${existingSession.stage_name}). ` +
          `Zakończ poprzednią sesję lub użyj auto_close_previous=true`,
          400
        );
      }
    }

    // Create new work session
    const sessionResult = await client.query(
      `INSERT INTO work_sessions (assignment_id, start_time)
       VALUES ($1, NOW())
       RETURNING *`,
      [assignmentId]
    );

    // Update assignment status to W_TRAKCIE
    await client.query(
      `UPDATE assignments SET status = 'W_TRAKCIE', updated_at = NOW() WHERE id = $1`,
      [assignmentId]
    );

    // Update stage status to W_TRAKCIE
    await client.query(
      `UPDATE stages SET status = 'W_TRAKCIE', updated_at = NOW() WHERE id = $1`,
      [assignment.stage_id]
    );

    // Update order status to W_TRAKCIE
    await client.query(
      `UPDATE orders SET status = 'W_TRAKCIE', updated_at = NOW() WHERE id = $1 AND status = 'NOWE'`,
      [assignment.order_id]
    );

    await client.query('COMMIT');

    logger.info(`Timer started for assignment ${assignmentId}`);

    res.status(201).json({
      success: true,
      data: {
        work_session: sessionResult.rows[0],
        message: 'Timer started',
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// POST /api/assignments/:assignmentId/stop
export const stopTimer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { assignmentId } = req.params;
  const { complete_assignment = false } = req.body;

  // Get active session
  const activeSessionResult = await query(
    `SELECT ws.*, a.worker_id, a.stage_id, s.order_id, w.hourly_rate
     FROM work_sessions ws
     JOIN assignments a ON ws.assignment_id = a.id
     JOIN stages s ON a.stage_id = s.id
     JOIN workers w ON a.worker_id = w.id
     WHERE ws.assignment_id = $1 AND ws.end_time IS NULL`,
    [assignmentId]
  );

  if (activeSessionResult.rows.length === 0) {
    throw new AppError('No active timer found for this assignment', 400);
  }

  const session = activeSessionResult.rows[0];
  const hourlyRate = parseFloat(session.hourly_rate);

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Calculate duration and cost
    const updateResult = await client.query(
      `UPDATE work_sessions
       SET
         end_time = NOW(),
         duration_minutes = EXTRACT(EPOCH FROM (NOW() - start_time)) / 60,
         cost = (EXTRACT(EPOCH FROM (NOW() - start_time)) / 3600) * $1,
         updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [hourlyRate, session.id]
    );

    const updatedSession = updateResult.rows[0];

    // If complete_assignment is true, mark assignment as completed
    if (complete_assignment) {
      await client.query(
        `UPDATE assignments SET status = 'GOTOWY', completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [assignmentId]
      );

      // Check if all assignments in stage are completed
      const stageAssignments = await client.query(
        'SELECT status FROM assignments WHERE stage_id = $1',
        [session.stage_id]
      );

      const allCompleted = stageAssignments.rows.every((a) => a.status === 'GOTOWY');

      if (allCompleted) {
        await client.query(
          `UPDATE stages SET status = 'GOTOWY', updated_at = NOW() WHERE id = $1`,
          [session.stage_id]
        );
      }
    }

    await client.query('COMMIT');

    // Update order status if assignment was completed
    if (complete_assignment) {
      await updateOrderStatusFromStages(session.order_id);
    }

    logger.info(
      `Timer stopped for assignment ${assignmentId}. Duration: ${updatedSession.duration_minutes} minutes`
    );

    res.json({
      success: true,
      data: {
        work_session: updatedSession,
        message: 'Timer stopped',
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// GET /api/assignments/:assignmentId/sessions
export const getAssignmentSessions = asyncHandler(async (req: Request, res: Response) => {
  const { assignmentId } = req.params;

  const sessionsResult = await query(
    'SELECT * FROM work_sessions WHERE assignment_id = $1 ORDER BY start_time DESC',
    [assignmentId]
  );

  // Calculate totals
  const totalMinutes = sessionsResult.rows.reduce(
    (sum, s) => sum + (s.duration_minutes || 0),
    0
  );
  const totalCost = sessionsResult.rows.reduce((sum, s) => sum + parseFloat(s.cost || 0), 0);

  // Check for active session
  const activeSession = sessionsResult.rows.find((s) => !s.end_time);

  res.json({
    success: true,
    data: {
      sessions: sessionsResult.rows,
      active_session: activeSession || null,
      totals: {
        total_minutes: Math.round(totalMinutes),
        total_hours: (totalMinutes / 60).toFixed(2),
        total_cost: totalCost.toFixed(2),
      },
    },
  });
});

// GET /api/workers/:workerId/active-session
export const getWorkerActiveSession = asyncHandler(async (req: Request, res: Response) => {
  const { workerId } = req.params;

  const activeSessionResult = await query(
    `SELECT
      ws.*,
      a.id as assignment_id,
      a.status as assignment_status,
      s.stage_name,
      s.stage_number,
      o.id as order_id,
      o.order_number,
      o.client_name,
      o.product_name
    FROM work_sessions ws
    JOIN assignments a ON ws.assignment_id = a.id
    JOIN stages s ON a.stage_id = s.id
    JOIN orders o ON s.order_id = o.id
    WHERE a.worker_id = $1 AND ws.end_time IS NULL
    ORDER BY ws.start_time DESC
    LIMIT 1`,
    [workerId]
  );

  if (activeSessionResult.rows.length === 0) {
    return res.json({
      success: true,
      data: {
        active_session: null,
      },
    });
  }

  const session = activeSessionResult.rows[0];

  // Calculate current duration
  const startTime = new Date(session.start_time);
  const now = new Date();
  const currentDurationMinutes = (now.getTime() - startTime.getTime()) / 1000 / 60;

  res.json({
    success: true,
    data: {
      active_session: {
        ...session,
        current_duration_minutes: Math.round(currentDurationMinutes),
        current_duration_seconds: Math.round(currentDurationMinutes * 60),
      },
    },
  });
});

// DELETE /api/work-sessions/:id
export const deleteWorkSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;

  // Check if session exists and get worker info
  const existingResult = await query(
    `SELECT ws.id, a.worker_id, w.user_id
     FROM work_sessions ws
     JOIN assignments a ON ws.assignment_id = a.id
     JOIN workers w ON a.worker_id = w.id
     WHERE ws.id = $1`,
    [id]
  );

  if (existingResult.rows.length === 0) {
    throw new AppError('Work session not found', 404);
  }

  const session = existingResult.rows[0];

  // TASK 1.2: Ownership validation - PRACOWNIK can only delete own sessions
  if (user?.role === 'PRACOWNIK') {
    if (session.user_id !== user.id) {
      throw new AppError('Nie masz uprawnień do usunięcia tej sesji pracy', 403);
    }
  }

  await query('DELETE FROM work_sessions WHERE id = $1', [id]);

  logger.info(`Work session deleted: ${id} by user ${user?.id}`);

  res.json({
    success: true,
    message: 'Work session deleted successfully',
  });
});

// PUT /api/work-sessions/:id (manual correction)
export const updateWorkSession = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { start_time, end_time, duration_minutes } = req.body;
  const user = req.user;

  // Check if session exists and get worker info
  const existingResult = await query(
    `SELECT ws.*, w.hourly_rate, w.user_id as worker_user_id
     FROM work_sessions ws
     JOIN assignments a ON ws.assignment_id = a.id
     JOIN workers w ON a.worker_id = w.id
     WHERE ws.id = $1`,
    [id]
  );

  if (existingResult.rows.length === 0) {
    throw new AppError('Work session not found', 404);
  }

  const session = existingResult.rows[0];

  // TASK 1.2: Ownership validation - PRACOWNIK can only edit own sessions
  if (user?.role === 'PRACOWNIK') {
    if (session.worker_user_id !== user.id) {
      throw new AppError('Nie masz uprawnień do edycji tej sesji pracy', 403);
    }
  }

  // Calculate new values
  let newStartTime = start_time ? new Date(start_time) : session.start_time;
  let newEndTime = end_time ? new Date(end_time) : session.end_time;
  let newDurationMinutes = duration_minutes;

  if (!newDurationMinutes && newStartTime && newEndTime) {
    newDurationMinutes = (newEndTime.getTime() - newStartTime.getTime()) / 1000 / 60;
  }

  const hourlyRate = parseFloat(session.hourly_rate);
  const newCost = newDurationMinutes ? (newDurationMinutes / 60) * hourlyRate : null;

  const result = await query(
    `UPDATE work_sessions
     SET start_time = $1, end_time = $2, duration_minutes = $3, cost = $4, updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [newStartTime, newEndTime, newDurationMinutes, newCost, id]
  );

  logger.info(`Work session ${id} manually updated`);

  res.json({
    success: true,
    data: {
      work_session: result.rows[0],
    },
  });
});
