import { Request, Response } from 'express';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

// Get comprehensive production report
export const getProductionReport = async (req: Request, res: Response) => {
  try {
    const { from_date, to_date, department } = req.query;

    const fromDate = from_date ? new Date(from_date as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to_date ? new Date(to_date as string) : new Date();

    // Overall production metrics
    const ordersResult = await pool.query(`
      SELECT
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'GOTOWE' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN status = 'W_TRAKCIE' THEN 1 ELSE 0 END) as in_progress_orders,
        SUM(quantity) as total_quantity,
        SUM(CASE WHEN status = 'GOTOWE' THEN quantity ELSE 0 END) as completed_quantity,
        SUM(price_total) as total_revenue,
        SUM(CASE WHEN status = 'GOTOWE' THEN price_total ELSE 0 END) as completed_revenue,
        AVG(CASE WHEN status = 'GOTOWE' THEN quantity ELSE NULL END) as avg_order_size
      FROM orders
      WHERE created_at >= $1 AND created_at <= $2
        AND archived = false
    `, [fromDate, toDate]);

    // Time tracking metrics
    const timeResult = await pool.query(`
      SELECT
        COUNT(DISTINCT ws.id) as total_sessions,
        COUNT(DISTINCT a.worker_id) as active_workers,
        SUM(
          CASE WHEN ws.end_time IS NOT NULL
          THEN EXTRACT(EPOCH FROM (ws.end_time - ws.start_time)) / 3600
          ELSE 0 END
        )::numeric(10,2) as total_hours_worked,
        AVG(
          CASE WHEN ws.end_time IS NOT NULL
          THEN EXTRACT(EPOCH FROM (ws.end_time - ws.start_time)) / 3600
          ELSE NULL END
        )::numeric(10,2) as avg_session_hours
      FROM work_sessions ws
      LEFT JOIN assignments a ON ws.assignment_id = a.id
      WHERE ws.start_time >= $1 AND ws.start_time <= $2
    `, [fromDate, toDate]);

    // Production by department (group by current stage from stages table)
    const departmentResult = await pool.query(`
      SELECT
        s.stage_name as department,
        COUNT(DISTINCT o.id) as orders_count,
        SUM(o.quantity) as total_quantity,
        SUM(o.price_total) as total_value,
        AVG(o.quantity) as avg_quantity
      FROM orders o
      LEFT JOIN stages s ON s.order_id = o.id AND s.status = 'W_TRAKCIE'
      WHERE o.created_at >= $1 AND o.created_at <= $2
        AND o.archived = false
      GROUP BY s.stage_name
      ORDER BY orders_count DESC
    `, [fromDate, toDate]);

    // Daily production trend
    const dailyResult = await pool.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as orders_created,
        SUM(quantity) as quantity,
        SUM(price_total) as revenue
      FROM orders
      WHERE created_at >= $1 AND created_at <= $2
        AND archived = false
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [fromDate, toDate]);

    // Worker productivity
    const workerResult = await pool.query(`
      SELECT
        w.id,
        w.name,
        w.position as department,
        COUNT(DISTINCT ws.id) as sessions_count,
        SUM(
          CASE WHEN ws.end_time IS NOT NULL
          THEN EXTRACT(EPOCH FROM (ws.end_time - ws.start_time)) / 3600
          ELSE 0 END
        )::numeric(10,2) as hours_worked,
        COUNT(DISTINCT s.order_id) as orders_worked
      FROM workers w
      LEFT JOIN assignments a ON a.worker_id = w.id
      LEFT JOIN work_sessions ws ON ws.assignment_id = a.id
        AND ws.start_time >= $1 AND ws.start_time <= $2
      LEFT JOIN stages s ON a.stage_id = s.id
      WHERE w.active = true
      GROUP BY w.id, w.name, w.position
      ORDER BY hours_worked DESC
    `, [fromDate, toDate]);

    // On-time delivery rate
    const deliveryResult = await pool.query(`
      SELECT
        COUNT(*) as total_completed,
        SUM(CASE
          WHEN status = 'GOTOWE' AND
               (SELECT MAX(ws.end_time) FROM work_sessions ws
                JOIN assignments a ON ws.assignment_id = a.id
                JOIN stages s ON a.stage_id = s.id
                WHERE s.order_id = orders.id) <= planned_completion_date
          THEN 1 ELSE 0 END
        ) as on_time_count
      FROM orders
      WHERE status = 'GOTOWE'
        AND created_at >= $1 AND created_at <= $2
        AND archived = false
    `, [fromDate, toDate]);

    // Quality metrics (using quality_checks table)
    const qualityResult = await pool.query(`
      SELECT
        COUNT(*) as total_inspections,
        SUM(CASE WHEN status = 'PASS' THEN 1 ELSE 0 END) as passed_count,
        SUM(CASE WHEN status = 'FAIL' THEN 1 ELSE 0 END) as failed_count,
        (SUM(CASE WHEN status = 'PASS' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) * 100)::numeric(5,2) as pass_rate
      FROM quality_checks
      WHERE checked_at >= $1 AND checked_at <= $2
    `, [fromDate, toDate]);

    const orders = ordersResult.rows[0];
    const time = timeResult.rows[0];
    const delivery = deliveryResult.rows[0];
    const quality = qualityResult.rows[0];

    // Calculate efficiency metrics
    const completionRate = orders.total_orders > 0
      ? Math.round((orders.completed_orders / orders.total_orders) * 100)
      : 0;

    const onTimeRate = delivery.total_completed > 0
      ? Math.round((delivery.on_time_count / delivery.total_completed) * 100)
      : 0;

    const qualityPassRate = parseFloat(quality.pass_rate) || 0;

    res.json({
      success: true,
      data: {
        period: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
          days: Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
        },
        overview: {
          total_orders: parseInt(orders.total_orders) || 0,
          completed_orders: parseInt(orders.completed_orders) || 0,
          in_progress_orders: parseInt(orders.in_progress_orders) || 0,
          total_quantity: parseInt(orders.total_quantity) || 0,
          completed_quantity: parseInt(orders.completed_quantity) || 0,
          total_revenue: parseFloat(orders.total_revenue) || 0,
          completed_revenue: parseFloat(orders.completed_revenue) || 0,
          avg_order_size: parseFloat(orders.avg_order_size) || 0,
          completion_rate: completionRate
        },
        time_tracking: {
          total_sessions: parseInt(time.total_sessions) || 0,
          active_workers: parseInt(time.active_workers) || 0,
          total_hours_worked: parseFloat(time.total_hours_worked) || 0,
          avg_session_hours: parseFloat(time.avg_session_hours) || 0
        },
        efficiency: {
          on_time_delivery_rate: onTimeRate,
          quality_pass_rate: qualityPassRate,
          completion_rate: completionRate
        },
        by_department: departmentResult.rows.map((d: any) => ({
          department: d.department,
          orders_count: parseInt(d.orders_count),
          total_quantity: parseInt(d.total_quantity) || 0,
          total_value: parseFloat(d.total_value) || 0,
          avg_quantity: parseFloat(d.avg_quantity) || 0
        })),
        daily_trend: dailyResult.rows.map((d: any) => ({
          date: d.date,
          orders_created: parseInt(d.orders_created),
          quantity: parseInt(d.quantity) || 0,
          revenue: parseFloat(d.revenue) || 0
        })),
        worker_productivity: workerResult.rows.map((w: any) => ({
          id: w.id,
          name: w.name,
          department: w.department,
          sessions_count: parseInt(w.sessions_count) || 0,
          hours_worked: parseFloat(w.hours_worked) || 0,
          orders_worked: parseInt(w.orders_worked) || 0
        })),
        quality: {
          total_inspections: parseInt(quality.total_inspections) || 0,
          passed: parseInt(quality.passed_count) || 0,
          failed: parseInt(quality.failed_count) || 0,
          pass_rate: qualityPassRate
        }
      }
    });
  } catch (error) {
    logger.error('Error generating production report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate production report'
    });
  }
};

// Get comparison report (this period vs previous period)
export const getComparisonReport = async (req: Request, res: Response) => {
  try {
    const { from_date, to_date } = req.query;

    const toDate = to_date ? new Date(to_date as string) : new Date();
    const fromDate = from_date ? new Date(from_date as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const periodDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    const prevFromDate = new Date(fromDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const prevToDate = new Date(fromDate.getTime() - 1);

    // Current period
    const currentResult = await pool.query(`
      SELECT
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'GOTOWE' THEN 1 ELSE 0 END) as completed,
        SUM(quantity) as quantity,
        SUM(price_total) as revenue
      FROM orders
      WHERE created_at >= $1 AND created_at <= $2
        AND archived = false
    `, [fromDate, toDate]);

    // Previous period
    const previousResult = await pool.query(`
      SELECT
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'GOTOWE' THEN 1 ELSE 0 END) as completed,
        SUM(quantity) as quantity,
        SUM(price_total) as revenue
      FROM orders
      WHERE created_at >= $1 AND created_at <= $2
        AND archived = false
    `, [prevFromDate, prevToDate]);

    const current = currentResult.rows[0];
    const previous = previousResult.rows[0];

    const calculateChange = (curr: number, prev: number): number => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    res.json({
      success: true,
      data: {
        current_period: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
          total_orders: parseInt(current.total_orders) || 0,
          completed: parseInt(current.completed) || 0,
          quantity: parseInt(current.quantity) || 0,
          revenue: parseFloat(current.revenue) || 0
        },
        previous_period: {
          from: prevFromDate.toISOString(),
          to: prevToDate.toISOString(),
          total_orders: parseInt(previous.total_orders) || 0,
          completed: parseInt(previous.completed) || 0,
          quantity: parseInt(previous.quantity) || 0,
          revenue: parseFloat(previous.revenue) || 0
        },
        changes: {
          orders_change: calculateChange(parseInt(current.total_orders), parseInt(previous.total_orders)),
          completed_change: calculateChange(parseInt(current.completed), parseInt(previous.completed)),
          quantity_change: calculateChange(parseInt(current.quantity), parseInt(previous.quantity)),
          revenue_change: calculateChange(parseFloat(current.revenue), parseFloat(previous.revenue))
        }
      }
    });
  } catch (error) {
    logger.error('Error generating comparison report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate comparison report'
    });
  }
};

// Get export data (for CSV/Excel)
export const getExportData = async (req: Request, res: Response) => {
  try {
    const { from_date, to_date, type } = req.query;

    const fromDate = from_date ? new Date(from_date as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to_date ? new Date(to_date as string) : new Date();

    let data: any[] = [];

    if (type === 'orders') {
      const result = await pool.query(`
        SELECT
          o.order_number,
          o.client_name,
          o.product_name,
          o.quantity,
          o.price_per_unit,
          o.price_total,
          o.status,
          o.priority,
          (SELECT s.stage_name FROM stages s WHERE s.order_id = o.id AND s.status = 'W_TRAKCIE' LIMIT 1) as current_stage,
          o.planned_completion_date,
          o.created_at
        FROM orders o
        WHERE o.created_at >= $1 AND o.created_at <= $2
        ORDER BY o.created_at DESC
      `, [fromDate, toDate]);
      data = result.rows;
    } else if (type === 'work_sessions') {
      const result = await pool.query(`
        SELECT
          ws.id,
          w.name as worker_name,
          o.order_number,
          s.stage_name as stage_name,
          ws.start_time,
          ws.end_time,
          CASE WHEN ws.end_time IS NOT NULL
            THEN EXTRACT(EPOCH FROM (ws.end_time - ws.start_time)) / 3600
            ELSE NULL END as hours_worked
        FROM work_sessions ws
        LEFT JOIN assignments a ON ws.assignment_id = a.id
        LEFT JOIN workers w ON a.worker_id = w.id
        LEFT JOIN stages s ON a.stage_id = s.id
        LEFT JOIN orders o ON s.order_id = o.id
        WHERE ws.start_time >= $1 AND ws.start_time <= $2
        ORDER BY ws.start_time DESC
      `, [fromDate, toDate]);
      data = result.rows;
    } else if (type === 'quality') {
      const result = await pool.query(`
        SELECT
          qi.id,
          o.order_number,
          s.stage_name as stage_name,
          qi.inspection_type,
          qi.passed,
          qi.defect_type,
          qi.defect_description,
          qi.severity,
          w.name as inspector_name,
          qi.inspected_at
        FROM quality_inspections qi
        LEFT JOIN stages s ON qi.stage_id = s.id
        LEFT JOIN orders o ON s.order_id = o.id
        LEFT JOIN workers w ON qi.inspector_id = w.id
        WHERE qi.inspected_at >= $1 AND qi.inspected_at <= $2
        ORDER BY qi.inspected_at DESC
      `, [fromDate, toDate]);
      data = result.rows;
    }

    res.json({
      success: true,
      data: {
        type,
        period: { from: fromDate.toISOString(), to: toDate.toISOString() },
        count: data.length,
        records: data
      }
    });
  } catch (error) {
    logger.error('Error getting export data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get export data'
    });
  }
};
