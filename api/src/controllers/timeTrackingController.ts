import { Request, Response } from 'express';
import { query } from '../config/database';

// ==================== HELPERS ====================

// Smooth time to interval (up for entry, down for exit)
const smoothTime = (time: Date, intervalMinutes: number, direction: 'up' | 'down'): Date => {
  const minutes = time.getMinutes();
  const remainder = minutes % intervalMinutes;
  if (remainder === 0) return time;

  const result = new Date(time);
  if (direction === 'up') {
    result.setMinutes(minutes + (intervalMinutes - remainder));
  } else {
    result.setMinutes(minutes - remainder);
  }
  result.setSeconds(0);
  result.setMilliseconds(0);
  return result;
};

// Calculate work minutes and overtime
const calculateWorkTime = (entrySmoothed: Date, exitSmoothed: Date, baseMinutes: number = 480) => {
  const workMinutes = Math.round((exitSmoothed.getTime() - entrySmoothed.getTime()) / 60000);
  const overtime = Math.max(0, workMinutes - baseMinutes);
  return { workMinutes, overtime };
};

// ==================== WORK TIME ENTRIES ====================

export const getWorkTimeEntries = async (req: Request, res: Response) => {
  try {
    const { worker_id, start_date, end_date, limit = 100, offset = 0 } = req.query;

    let sql = `
      SELECT
        wte.*,
        w.name as worker_name,
        w.position as worker_position,
        cb.name as created_by_name,
        ab.name as approved_by_name
      FROM work_time_entries wte
      LEFT JOIN workers w ON wte.worker_id = w.id
      LEFT JOIN workers cb ON wte.created_by = cb.id
      LEFT JOIN workers ab ON wte.approved_by = ab.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (worker_id) {
      sql += ` AND wte.worker_id = $${paramIndex++}`;
      params.push(worker_id);
    }

    if (start_date) {
      sql += ` AND DATE(wte.entry_time) >= $${paramIndex++}`;
      params.push(start_date);
    }

    if (end_date) {
      sql += ` AND DATE(wte.entry_time) <= $${paramIndex++}`;
      params.push(end_date);
    }

    sql += ` ORDER BY wte.entry_time DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching work time entries:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getWorkTimeEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT
        wte.*,
        w.name as worker_name,
        w.position as worker_position
      FROM work_time_entries wte
      LEFT JOIN workers w ON wte.worker_id = w.id
      WHERE wte.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching work time entry:', error);
    res.status(500).json({ error: error.message });
  }
};

export const createWorkTimeEntry = async (req: Request, res: Response) => {
  try {
    const { worker_id, entry_time, exit_time, shift = 'DZIEŃ', notes, source = 'manual' } = req.body;
    const userId = (req as any).user?.id;

    // Get smoothing interval from settings
    const settingsResult = await query(
      `SELECT setting_value FROM time_smoothing_settings WHERE setting_key = 'smoothing_interval_minutes'`
    );
    const intervalMinutes = settingsResult.rows[0]?.setting_value || 15;

    const entryDate = new Date(entry_time);
    const entrySmoothed = smoothTime(entryDate, intervalMinutes, 'up');

    let exitSmoothed = null;
    let workMinutes = null;
    let workMinutesSmoothed = null;
    let overtime = 0;

    if (exit_time) {
      const exitDate = new Date(exit_time);
      exitSmoothed = smoothTime(exitDate, intervalMinutes, 'down');
      workMinutes = Math.round((exitDate.getTime() - entryDate.getTime()) / 60000);
      const calc = calculateWorkTime(entrySmoothed, exitSmoothed);
      workMinutesSmoothed = calc.workMinutes;
      overtime = calc.overtime;
    }

    const result = await query(`
      INSERT INTO work_time_entries (
        worker_id, entry_time, exit_time, shift,
        entry_time_smoothed, exit_time_smoothed,
        work_minutes, work_minutes_smoothed, overtime_minutes,
        notes, source, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      worker_id, entry_time, exit_time, shift,
      entrySmoothed.toISOString(), exitSmoothed?.toISOString() || null,
      workMinutes, workMinutesSmoothed, overtime,
      notes, source, userId
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating work time entry:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateWorkTimeEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { entry_time, exit_time, shift, notes, break_minutes } = req.body;

    // Get smoothing interval from settings
    const settingsResult = await query(
      `SELECT setting_value FROM time_smoothing_settings WHERE setting_key = 'smoothing_interval_minutes'`
    );
    const intervalMinutes = settingsResult.rows[0]?.setting_value || 15;

    const entryDate = new Date(entry_time);
    const entrySmoothed = smoothTime(entryDate, intervalMinutes, 'up');

    let exitSmoothed = null;
    let workMinutes = null;
    let workMinutesSmoothed = null;
    let overtime = 0;

    if (exit_time) {
      const exitDate = new Date(exit_time);
      exitSmoothed = smoothTime(exitDate, intervalMinutes, 'down');
      workMinutes = Math.round((exitDate.getTime() - entryDate.getTime()) / 60000);
      const calc = calculateWorkTime(entrySmoothed, exitSmoothed);
      workMinutesSmoothed = calc.workMinutes;
      overtime = calc.overtime;
    }

    const result = await query(`
      UPDATE work_time_entries SET
        entry_time = $1,
        exit_time = $2,
        shift = $3,
        entry_time_smoothed = $4,
        exit_time_smoothed = $5,
        work_minutes = $6,
        work_minutes_smoothed = $7,
        overtime_minutes = $8,
        notes = $9,
        break_minutes = $10,
        updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `, [
      entry_time, exit_time, shift,
      entrySmoothed.toISOString(), exitSmoothed?.toISOString() || null,
      workMinutes, workMinutesSmoothed, overtime,
      notes, break_minutes || 0, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating work time entry:', error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteWorkTimeEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM work_time_entries WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json({ success: true, message: 'Entry deleted' });
  } catch (error: any) {
    console.error('Error deleting work time entry:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== CLOCK IN/OUT ====================

export const clockIn = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if already clocked in today
    const existingEntry = await query(`
      SELECT id FROM work_time_entries
      WHERE worker_id = $1 AND DATE(entry_time) = CURRENT_DATE AND exit_time IS NULL
    `, [userId]);

    if (existingEntry.rows.length > 0) {
      return res.status(400).json({ error: 'Already clocked in today' });
    }

    // Get smoothing interval
    const settingsResult = await query(
      `SELECT setting_value FROM time_smoothing_settings WHERE setting_key = 'smoothing_interval_minutes'`
    );
    const intervalMinutes = settingsResult.rows[0]?.setting_value || 15;

    const now = new Date();
    const entrySmoothed = smoothTime(now, intervalMinutes, 'up');

    const result = await query(`
      INSERT INTO work_time_entries (worker_id, entry_time, entry_time_smoothed, source, created_by)
      VALUES ($1, $2, $3, 'pin', $1)
      RETURNING *
    `, [userId, now.toISOString(), entrySmoothed.toISOString()]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error clocking in:', error);
    res.status(500).json({ error: error.message });
  }
};

export const clockOut = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Find open entry for today
    const openEntry = await query(`
      SELECT * FROM work_time_entries
      WHERE worker_id = $1 AND DATE(entry_time) = CURRENT_DATE AND exit_time IS NULL
      ORDER BY entry_time DESC LIMIT 1
    `, [userId]);

    if (openEntry.rows.length === 0) {
      return res.status(400).json({ error: 'No open entry found for today' });
    }

    const entry = openEntry.rows[0];

    // Get smoothing interval
    const settingsResult = await query(
      `SELECT setting_value FROM time_smoothing_settings WHERE setting_key = 'smoothing_interval_minutes'`
    );
    const intervalMinutes = settingsResult.rows[0]?.setting_value || 15;

    const now = new Date();
    const exitSmoothed = smoothTime(now, intervalMinutes, 'down');
    const entrySmoothed = new Date(entry.entry_time_smoothed);

    const workMinutes = Math.round((now.getTime() - new Date(entry.entry_time).getTime()) / 60000);
    const calc = calculateWorkTime(entrySmoothed, exitSmoothed);

    const result = await query(`
      UPDATE work_time_entries SET
        exit_time = $1,
        exit_time_smoothed = $2,
        work_minutes = $3,
        work_minutes_smoothed = $4,
        overtime_minutes = $5,
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [now.toISOString(), exitSmoothed.toISOString(), workMinutes, calc.workMinutes, calc.overtime, entry.id]);

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error clocking out:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== DAYS OFF ====================

export const getDaysOff = async (req: Request, res: Response) => {
  try {
    const { worker_id, start_date, end_date, status, type } = req.query;

    let sql = `
      SELECT
        d.*,
        w.name as worker_name,
        rb.name as requested_by_name,
        ab.name as approved_by_name
      FROM days_off d
      LEFT JOIN workers w ON d.worker_id = w.id
      LEFT JOIN workers rb ON d.requested_by = rb.id
      LEFT JOIN workers ab ON d.approved_by = ab.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (worker_id) {
      sql += ` AND d.worker_id = $${paramIndex++}`;
      params.push(worker_id);
    }

    if (start_date) {
      sql += ` AND d.end_date >= $${paramIndex++}`;
      params.push(start_date);
    }

    if (end_date) {
      sql += ` AND d.start_date <= $${paramIndex++}`;
      params.push(end_date);
    }

    if (status) {
      sql += ` AND d.status = $${paramIndex++}`;
      params.push(status);
    }

    if (type) {
      sql += ` AND d.type = $${paramIndex++}`;
      params.push(type);
    }

    sql += ` ORDER BY d.start_date DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching days off:', error);
    res.status(500).json({ error: error.message });
  }
};

export const createDayOff = async (req: Request, res: Response) => {
  try {
    const { worker_id, start_date, end_date, type, notes } = req.body;
    const userId = (req as any).user?.id;

    const result = await query(`
      INSERT INTO days_off (worker_id, start_date, end_date, type, notes, requested_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [worker_id, start_date, end_date, type, notes, userId]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating day off:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateDayOff = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { start_date, end_date, type, notes, status } = req.body;

    const result = await query(`
      UPDATE days_off SET
        start_date = COALESCE($1, start_date),
        end_date = COALESCE($2, end_date),
        type = COALESCE($3, type),
        notes = COALESCE($4, notes),
        status = COALESCE($5, status),
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [start_date, end_date, type, notes, status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Day off not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating day off:', error);
    res.status(500).json({ error: error.message });
  }
};

export const approveDayOff = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = (req as any).user?.id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await query(`
      UPDATE days_off SET
        status = $1,
        approved_by = $2,
        approved_at = NOW(),
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [status, userId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Day off not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error approving day off:', error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteDayOff = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM days_off WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Day off not found' });
    }

    res.json({ success: true, message: 'Day off deleted' });
  } catch (error: any) {
    console.error('Error deleting day off:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== REPORTS ====================

export const getWorkerWorkCard = async (req: Request, res: Response) => {
  try {
    const { worker_id } = req.params;
    const { year, month } = req.query;

    const currentDate = new Date();
    const targetYear = year ? parseInt(year as string) : currentDate.getFullYear();
    const targetMonth = month ? parseInt(month as string) : currentDate.getMonth() + 1;

    // Get worker info
    const workerResult = await query(
      'SELECT id, name, position FROM workers WHERE id = $1',
      [worker_id]
    );

    if (workerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    const worker = workerResult.rows[0];

    // Get entries for the month
    const entriesResult = await query(`
      SELECT
        wte.*,
        cb.name as created_by_name,
        ab.name as approved_by_name
      FROM work_time_entries wte
      LEFT JOIN workers cb ON wte.created_by = cb.id
      LEFT JOIN workers ab ON wte.approved_by = ab.id
      WHERE wte.worker_id = $1
        AND EXTRACT(YEAR FROM wte.entry_time) = $2
        AND EXTRACT(MONTH FROM wte.entry_time) = $3
      ORDER BY wte.entry_time
    `, [worker_id, targetYear, targetMonth]);

    // Get days off for the month
    const daysOffResult = await query(`
      SELECT *
      FROM days_off
      WHERE worker_id = $1
        AND (
          (EXTRACT(YEAR FROM start_date) = $2 AND EXTRACT(MONTH FROM start_date) = $3)
          OR (EXTRACT(YEAR FROM end_date) = $2 AND EXTRACT(MONTH FROM end_date) = $3)
        )
        AND status = 'approved'
      ORDER BY start_date
    `, [worker_id, targetYear, targetMonth]);

    // Calculate summary
    const entries = entriesResult.rows;
    const daysOff = daysOffResult.rows;

    const summary = {
      workDays: entries.filter((e: any) => e.exit_time).length,
      absenceDays: daysOff.reduce((sum: number, d: any) => {
        const start = new Date(d.start_date);
        const end = new Date(d.end_date);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return sum + days;
      }, 0),
      totalWorkMinutes: entries.reduce((sum: number, e: any) => sum + (e.work_minutes || 0), 0),
      totalWorkMinutesSmoothed: entries.reduce((sum: number, e: any) => sum + (e.work_minutes_smoothed || 0), 0),
      baseMinutesSmoothed: 0,
      overtimeMinutesSmoothed: entries.reduce((sum: number, e: any) => sum + (e.overtime_minutes || 0), 0),
    };
    summary.baseMinutesSmoothed = summary.totalWorkMinutesSmoothed - summary.overtimeMinutesSmoothed;

    res.json({
      worker,
      year: targetYear,
      month: targetMonth,
      entries,
      daysOff,
      summary,
    });
  } catch (error: any) {
    console.error('Error fetching worker work card:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getMonthlySummary = async (req: Request, res: Response) => {
  try {
    const { year, month } = req.query;

    const currentDate = new Date();
    const targetYear = year ? parseInt(year as string) : currentDate.getFullYear();
    const targetMonth = month ? parseInt(month as string) : currentDate.getMonth() + 1;

    const result = await query(`
      WITH worker_entries AS (
        SELECT
          worker_id,
          COUNT(*) FILTER (WHERE exit_time IS NOT NULL) as work_days,
          COALESCE(SUM(work_minutes), 0) as total_work_minutes,
          COALESCE(SUM(work_minutes_smoothed), 0) as total_work_minutes_smoothed,
          COALESCE(SUM(overtime_minutes), 0) as overtime_minutes_smoothed
        FROM work_time_entries
        WHERE EXTRACT(YEAR FROM entry_time) = $1
          AND EXTRACT(MONTH FROM entry_time) = $2
        GROUP BY worker_id
      ),
      worker_absences AS (
        SELECT
          worker_id,
          SUM(
            CASE
              WHEN EXTRACT(MONTH FROM start_date) = $2 AND EXTRACT(MONTH FROM end_date) = $2
                THEN (end_date - start_date + 1)
              WHEN EXTRACT(MONTH FROM start_date) = $2
                THEN (DATE_TRUNC('month', start_date) + INTERVAL '1 month' - INTERVAL '1 day')::date - start_date + 1
              WHEN EXTRACT(MONTH FROM end_date) = $2
                THEN end_date - DATE_TRUNC('month', end_date)::date + 1
              ELSE 0
            END
          ) as absence_days
        FROM days_off
        WHERE status = 'approved'
          AND (
            (EXTRACT(YEAR FROM start_date) = $1 AND EXTRACT(MONTH FROM start_date) = $2)
            OR (EXTRACT(YEAR FROM end_date) = $1 AND EXTRACT(MONTH FROM end_date) = $2)
          )
        GROUP BY worker_id
      )
      SELECT
        w.id as worker_id,
        w.name as worker_name,
        w.position,
        COALESCE(we.work_days, 0) as work_days,
        COALESCE(wa.absence_days, 0) as absence_days,
        COALESCE(we.total_work_minutes, 0) as total_work_minutes,
        COALESCE(we.total_work_minutes_smoothed, 0) as total_work_minutes_smoothed,
        COALESCE(we.total_work_minutes_smoothed, 0) - COALESCE(we.overtime_minutes_smoothed, 0) as base_minutes_smoothed,
        COALESCE(we.overtime_minutes_smoothed, 0) as overtime_minutes_smoothed
      FROM workers w
      LEFT JOIN worker_entries we ON w.id = we.worker_id
      LEFT JOIN worker_absences wa ON w.id = wa.worker_id
      WHERE w.active = true
        AND (we.work_days > 0 OR wa.absence_days > 0)
      ORDER BY w.name
    `, [targetYear, targetMonth]);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching monthly summary:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== SETTINGS ====================

export const getSettings = async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM time_smoothing_settings ORDER BY id');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateSetting = async (req: Request, res: Response) => {
  try {
    const { setting_key, setting_value } = req.body;
    const userId = (req as any).user?.id;

    const result = await query(`
      UPDATE time_smoothing_settings
      SET setting_value = $1, updated_by = $2, updated_at = NOW()
      WHERE setting_key = $3
      RETURNING *
    `, [setting_value, userId, setting_key]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: error.message });
  }
};
