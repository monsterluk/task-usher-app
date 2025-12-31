import { Request, Response } from 'express';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

// Get capacity overview - machines and workers
export const getCapacityOverview = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    const startDate = start_date ? new Date(start_date as string) : new Date();
    const endDate = end_date ? new Date(end_date as string) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // Get machine capacity
    const machinesResult = await pool.query(`
      SELECT
        m.id,
        m.name,
        m.department,
        m.status,
        m.cost_per_hour,
        1 as capacity_per_hour,
        COALESCE(
          (SELECT COUNT(*) FROM stages s
           JOIN orders o ON s.order_id = o.id
           WHERE s.machine_id = m.id
           AND s.status = 'W_TRAKCIE'
           AND o.archived = false), 0
        ) as active_orders,
        COALESCE(
          (SELECT SUM(o.quantity) FROM stages s
           JOIN orders o ON s.order_id = o.id
           WHERE s.machine_id = m.id
           AND s.status IN ('NOWY', 'W_TRAKCIE')
           AND o.archived = false), 0
        ) as pending_quantity
      FROM machines m
      WHERE m.active = true
      ORDER BY m.department, m.name
    `);

    // Get workers by department
    const workersResult = await pool.query(`
      SELECT
        w.id,
        w.name,
        w.position as department,
        'PRACOWNIK' as role,
        w.active,
        COALESCE(
          (SELECT COUNT(*) FROM assignments a
           WHERE a.worker_id = w.id
           AND a.status IN ('ASSIGNED', 'W_TRAKCIE', 'in_progress')), 0
        ) as active_assignments
      FROM workers w
      WHERE w.active = true
      ORDER BY w.position, w.name
    `);

    // Calculate department capacity
    const departmentCapacity: { [key: string]: any } = {};

    machinesResult.rows.forEach((machine: any) => {
      const dept = machine.department || 'Inne';
      if (!departmentCapacity[dept]) {
        departmentCapacity[dept] = {
          department: dept,
          machines: [],
          workers: [],
          total_capacity_per_hour: 0,
          active_machines: 0,
          total_machines: 0,
          active_workers: 0,
          pending_quantity: 0
        };
      }
      departmentCapacity[dept].machines.push(machine);
      departmentCapacity[dept].total_machines++;
      if (machine.status === 'running' || machine.status === 'idle') {
        departmentCapacity[dept].active_machines++;
        departmentCapacity[dept].total_capacity_per_hour += machine.capacity_per_hour || 0;
      }
      departmentCapacity[dept].pending_quantity += parseInt(machine.pending_quantity) || 0;
    });

    workersResult.rows.forEach((worker: any) => {
      const dept = worker.department || 'Inne';
      if (!departmentCapacity[dept]) {
        departmentCapacity[dept] = {
          department: dept,
          machines: [],
          workers: [],
          total_capacity_per_hour: 0,
          active_machines: 0,
          total_machines: 0,
          active_workers: 0,
          pending_quantity: 0
        };
      }
      departmentCapacity[dept].workers.push(worker);
      departmentCapacity[dept].active_workers++;
    });

    // Calculate utilization metrics
    const departments = Object.values(departmentCapacity).map((dept: any) => {
      const hoursPerDay = 8;
      const daysInRange = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalCapacity = dept.total_capacity_per_hour * hoursPerDay * daysInRange;
      const utilizationPercent = totalCapacity > 0
        ? Math.min(100, Math.round((dept.pending_quantity / totalCapacity) * 100))
        : 0;

      return {
        ...dept,
        total_capacity: totalCapacity,
        utilization_percent: utilizationPercent,
        status: utilizationPercent > 90 ? 'overloaded' :
                utilizationPercent > 70 ? 'high' :
                utilizationPercent > 40 ? 'normal' : 'low'
      };
    });

    res.json({
      success: true,
      data: {
        departments,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        summary: {
          total_departments: departments.length,
          total_machines: machinesResult.rows.length,
          total_workers: workersResult.rows.length,
          overloaded_departments: departments.filter((d: any) => d.status === 'overloaded').length
        }
      }
    });
  } catch (error) {
    logger.error('Error getting capacity overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get capacity overview'
    });
  }
};

// Get workload forecast
export const getWorkloadForecast = async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 14;

    // Get orders with deadlines in the forecast period
    const ordersResult = await pool.query(`
      SELECT
        o.id,
        o.order_number,
        o.product_name,
        o.quantity,
        (SELECT s.stage_name FROM stages s WHERE s.order_id = o.id AND s.status = 'W_TRAKCIE' LIMIT 1) as current_stage,
        o.planned_completion_date,
        o.priority,
        o.status,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'stage', s.stage_name,
            'estimated_hours', COALESCE(s.planned_duration_minutes / 60.0, 0),
            'status', s.status
          )) FROM stages s WHERE s.order_id = o.id), '[]'
        ) as stages
      FROM orders o
      WHERE o.archived = false
        AND o.status IN ('NOWE', 'W_TRAKCIE')
        AND o.planned_completion_date <= NOW() + INTERVAL '${days} days'
      ORDER BY o.planned_completion_date ASC
    `);

    // Group by day
    const forecast: { [key: string]: any } = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < days; i++) {
      const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
      const key = date.toISOString().split('T')[0];
      forecast[key] = {
        date: key,
        day_name: date.toLocaleDateString('pl-PL', { weekday: 'short' }),
        orders_due: [],
        total_quantity: 0,
        estimated_hours: 0,
        is_weekend: date.getDay() === 0 || date.getDay() === 6
      };
    }

    ordersResult.rows.forEach((order: any) => {
      const deadline = new Date(order.planned_completion_date);
      deadline.setHours(0, 0, 0, 0);
      const key = deadline.toISOString().split('T')[0];

      if (forecast[key]) {
        forecast[key].orders_due.push({
          id: order.id,
          order_number: order.order_number,
          product_name: order.product_name,
          quantity: order.quantity,
          priority: order.priority,
          current_stage: order.current_stage
        });
        forecast[key].total_quantity += order.quantity || 0;

        // Sum estimated hours from remaining stages
        if (Array.isArray(order.stages)) {
          order.stages.forEach((stage: any) => {
            if (stage.status !== 'completed') {
              forecast[key].estimated_hours += stage.estimated_hours || 0;
            }
          });
        }
      }
    });

    res.json({
      success: true,
      data: {
        forecast: Object.values(forecast),
        summary: {
          total_orders: ordersResult.rows.length,
          total_quantity: ordersResult.rows.reduce((sum: number, o: any) => sum + (o.quantity || 0), 0),
          days_analyzed: days
        }
      }
    });
  } catch (error) {
    logger.error('Error getting workload forecast:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get workload forecast'
    });
  }
};

// Get bottleneck analysis
export const getBottleneckAnalysis = async (req: Request, res: Response) => {
  try {
    // Analyze stages with most pending work
    const stagesResult = await pool.query(`
      SELECT
        s.stage_name as stage_name,
        COUNT(DISTINCT o.id) as orders_count,
        SUM(o.quantity) as total_quantity,
        SUM(COALESCE(s.planned_duration_minutes / 60.0, 0)) as total_estimated_hours,
        AVG(EXTRACT(EPOCH FROM (NOW() - s.started_at)) / 3600)::numeric(10,2) as avg_hours_in_stage
      FROM stages s
      JOIN orders o ON s.order_id = o.id
      WHERE o.archived = false
        AND o.status IN ('NOWE', 'W_TRAKCIE')
        AND s.status IN ('NOWY', 'W_TRAKCIE', 'pending', 'in_progress')
      GROUP BY s.stage_name
      ORDER BY total_estimated_hours DESC
    `);

    // Get machine utilization
    const machineUtilResult = await pool.query(`
      SELECT
        m.department,
        COUNT(*) as total_machines,
        SUM(CASE WHEN m.status = 'running' THEN 1 ELSE 0 END) as running,
        SUM(CASE WHEN m.status = 'idle' THEN 1 ELSE 0 END) as idle,
        SUM(CASE WHEN m.status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
        SUM(CASE WHEN m.status = 'breakdown' THEN 1 ELSE 0 END) as breakdown
      FROM machines m
      WHERE m.active = true
      GROUP BY m.department
    `);

    // Identify bottlenecks
    const bottlenecks = stagesResult.rows.map((stage: any) => {
      const machineData = machineUtilResult.rows.find((m: any) =>
        m.department?.toLowerCase().includes(stage.stage_name?.toLowerCase().substring(0, 4))
      );

      const severityScore = (stage.orders_count * 2) + (stage.total_estimated_hours || 0);

      return {
        stage: stage.stage_name,
        orders_count: parseInt(stage.orders_count),
        total_quantity: parseInt(stage.total_quantity) || 0,
        estimated_hours: parseFloat(stage.total_estimated_hours) || 0,
        avg_hours_in_stage: parseFloat(stage.avg_hours_in_stage) || 0,
        machine_status: machineData ? {
          total: parseInt(machineData.total_machines),
          running: parseInt(machineData.running),
          idle: parseInt(machineData.idle),
          maintenance: parseInt(machineData.maintenance),
          breakdown: parseInt(machineData.breakdown)
        } : null,
        severity: severityScore > 50 ? 'critical' : severityScore > 20 ? 'high' : 'normal'
      };
    });

    res.json({
      success: true,
      data: {
        bottlenecks: bottlenecks.sort((a, b) => {
          const severityOrder = { critical: 0, high: 1, normal: 2 };
          return severityOrder[a.severity as keyof typeof severityOrder] -
                 severityOrder[b.severity as keyof typeof severityOrder];
        }),
        machine_summary: machineUtilResult.rows
      }
    });
  } catch (error) {
    logger.error('Error getting bottleneck analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get bottleneck analysis'
    });
  }
};

// Get worker availability
export const getWorkerAvailability = async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();

    const workersResult = await pool.query(`
      SELECT
        w.id,
        w.name,
        w.position as department,
        w.active,
        COALESCE(
          (SELECT COUNT(*) FROM assignments a
           WHERE a.worker_id = w.id
           AND a.status IN ('ASSIGNED', 'W_TRAKCIE', 'assigned', 'in_progress')), 0
        ) as active_tasks,
        COALESCE(
          (SELECT SUM(
            CASE WHEN ws.end_time IS NOT NULL
            THEN EXTRACT(EPOCH FROM (ws.end_time - ws.start_time)) / 3600
            ELSE EXTRACT(EPOCH FROM (NOW() - ws.start_time)) / 3600
            END
          ) FROM work_sessions ws
           JOIN assignments a ON ws.assignment_id = a.id
           WHERE a.worker_id = w.id
           AND DATE(ws.start_time) = DATE($1)), 0
        )::numeric(10,2) as hours_worked_today
      FROM workers w
      WHERE w.active = true
      ORDER BY w.position, w.name
    `, [targetDate]);

    const WORK_HOURS_PER_DAY = 8;

    const workers = workersResult.rows.map((w: any) => ({
      ...w,
      hours_worked_today: parseFloat(w.hours_worked_today) || 0,
      hours_remaining: Math.max(0, WORK_HOURS_PER_DAY - (parseFloat(w.hours_worked_today) || 0)),
      availability: parseFloat(w.hours_worked_today) >= WORK_HOURS_PER_DAY ? 'unavailable' :
                    parseInt(w.active_tasks) >= 3 ? 'busy' : 'available'
    }));

    // Group by department
    const byDepartment: { [key: string]: any[] } = {};
    workers.forEach(w => {
      const dept = w.department || 'Inne';
      if (!byDepartment[dept]) byDepartment[dept] = [];
      byDepartment[dept].push(w);
    });

    res.json({
      success: true,
      data: {
        date: targetDate.toISOString().split('T')[0],
        workers,
        by_department: byDepartment,
        summary: {
          total_workers: workers.length,
          available: workers.filter(w => w.availability === 'available').length,
          busy: workers.filter(w => w.availability === 'busy').length,
          unavailable: workers.filter(w => w.availability === 'unavailable').length,
          total_hours_remaining: workers.reduce((sum, w) => sum + w.hours_remaining, 0)
        }
      }
    });
  } catch (error) {
    logger.error('Error getting worker availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get worker availability'
    });
  }
};
