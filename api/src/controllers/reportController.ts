import { Request, Response } from 'express';
import { query } from '../config/database';
import { AuthRequest, OrderReport, StageReport, WorkerSessionReport } from '../types';
import { logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';

// GET /api/reports/order/:orderId
export const getOrderReport = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;

  // Get order
  const orderResult = await query('SELECT * FROM orders WHERE id = $1', [orderId]);

  if (orderResult.rows.length === 0) {
    throw new AppError('Order not found', 404);
  }

  const order = orderResult.rows[0];

  // Get all stages with assignments and work sessions
  const stagesResult = await query(
    `SELECT
      s.id,
      s.stage_name,
      s.stage_number,
      s.status,
      s.sequence_order
    FROM stages s
    WHERE s.order_id = $1
    ORDER BY s.sequence_order`,
    [orderId]
  );

  const stageReports: StageReport[] = [];
  let totalLaborCost = 0;

  for (const stage of stagesResult.rows) {
    // Get assignments with work sessions for this stage
    const assignmentsResult = await query(
      `SELECT
        a.id as assignment_id,
        w.name as worker_name,
        w.hourly_rate,
        COALESCE(SUM(ws.duration_minutes), 0) as total_time_minutes,
        COALESCE(SUM(ws.cost), 0) as total_cost
      FROM assignments a
      JOIN workers w ON a.worker_id = w.id
      LEFT JOIN work_sessions ws ON a.id = ws.assignment_id
      WHERE a.stage_id = $1
      GROUP BY a.id, w.name, w.hourly_rate`,
      [stage.id]
    );

    const assignments: WorkerSessionReport[] = assignmentsResult.rows.map((a) => ({
      worker_name: a.worker_name,
      total_time_minutes: parseFloat(a.total_time_minutes) || 0,
      hourly_rate: parseFloat(a.hourly_rate),
      total_cost: parseFloat(a.total_cost) || 0,
    }));

    const stageTotalCost = assignments.reduce((sum, a) => sum + a.total_cost, 0);
    totalLaborCost += stageTotalCost;

    stageReports.push({
      stage_name: stage.stage_name,
      assignments,
      stage_total_cost: stageTotalCost,
    });
  }

  const report: OrderReport = {
    order,
    stages: stageReports,
    total_labor_cost: totalLaborCost,
  };

  res.json({
    success: true,
    data: report,
  });
});

// GET /api/reports/export/:orderId
export const exportOrderReport = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { format = 'csv' } = req.query;

  // Get order
  const orderResult = await query('SELECT * FROM orders WHERE id = $1', [orderId]);

  if (orderResult.rows.length === 0) {
    throw new AppError('Order not found', 404);
  }

  const order = orderResult.rows[0];

  // Get all work sessions with details
  const sessionsResult = await query(
    `SELECT
      s.stage_name,
      s.stage_number,
      w.name as worker_name,
      w.hourly_rate,
      ws.start_time,
      ws.end_time,
      ws.duration_minutes,
      ws.cost
    FROM work_sessions ws
    JOIN assignments a ON ws.assignment_id = a.id
    JOIN stages s ON a.stage_id = s.id
    JOIN workers w ON a.worker_id = w.id
    WHERE s.order_id = $1
    ORDER BY s.sequence_order, ws.start_time`,
    [orderId]
  );

  if (format === 'csv') {
    // Generate CSV
    const headers = [
      'Etap',
      'Pracownik',
      'Stawka godzinowa',
      'Rozpoczecie',
      'Zakonczenie',
      'Czas (minuty)',
      'Koszt',
    ];

    let csvContent = headers.join(';') + '\n';

    for (const session of sessionsResult.rows) {
      const row = [
        session.stage_name,
        session.worker_name,
        session.hourly_rate,
        session.start_time ? new Date(session.start_time).toLocaleString('pl-PL') : '',
        session.end_time ? new Date(session.end_time).toLocaleString('pl-PL') : '',
        session.duration_minutes ? Math.round(session.duration_minutes) : 0,
        session.cost ? parseFloat(session.cost).toFixed(2) : '0.00',
      ];
      csvContent += row.join(';') + '\n';
    }

    // Add summary
    const totalMinutes = sessionsResult.rows.reduce(
      (sum, s) => sum + (parseFloat(s.duration_minutes) || 0),
      0
    );
    const totalCost = sessionsResult.rows.reduce(
      (sum, s) => sum + (parseFloat(s.cost) || 0),
      0
    );

    csvContent += '\n';
    csvContent += `PODSUMOWANIE;;;;\n`;
    csvContent += `Zlecenie;${order.order_number};;;;\n`;
    csvContent += `Klient;${order.client_name};;;;\n`;
    csvContent += `Produkt;${order.product_name};;;;\n`;
    csvContent += `Laczny czas (minuty);${Math.round(totalMinutes)};;;;\n`;
    csvContent += `Laczny czas (godziny);${(totalMinutes / 60).toFixed(2)};;;;\n`;
    csvContent += `Laczny koszt robocizny;${totalCost.toFixed(2)} PLN;;;;\n`;

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="raport_${order.order_number.replace('/', '-')}.csv"`
    );

    // Add BOM for Excel to recognize UTF-8
    res.send('\ufeff' + csvContent);
  } else {
    throw new AppError('Unsupported export format', 400);
  }
});

// GET /api/reports/worker/:workerId
export const getWorkerReport = asyncHandler(async (req: Request, res: Response) => {
  const { workerId } = req.params;
  const { from, to } = req.query;

  // Validate dates
  let fromDate = from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  let toDate = to ? new Date(to as string) : new Date();

  // Get worker
  const workerResult = await query(
    'SELECT id, name, email, position, hourly_rate FROM workers WHERE id = $1',
    [workerId]
  );

  if (workerResult.rows.length === 0) {
    throw new AppError('Worker not found', 404);
  }

  const worker = workerResult.rows[0];

  // Get work sessions
  const sessionsResult = await query(
    `SELECT
      ws.*,
      s.stage_name,
      o.id as order_id,
      o.order_number,
      o.client_name,
      o.product_name
    FROM work_sessions ws
    JOIN assignments a ON ws.assignment_id = a.id
    JOIN stages s ON a.stage_id = s.id
    JOIN orders o ON s.order_id = o.id
    WHERE a.worker_id = $1
      AND ws.start_time >= $2
      AND ws.start_time <= $3
    ORDER BY ws.start_time DESC`,
    [workerId, fromDate, toDate]
  );

  // Calculate totals
  const totalMinutes = sessionsResult.rows.reduce(
    (sum, s) => sum + (parseFloat(s.duration_minutes) || 0),
    0
  );
  const totalCost = sessionsResult.rows.reduce(
    (sum, s) => sum + (parseFloat(s.cost) || 0),
    0
  );

  // Group by order
  const orderSummary: Record<string, { order_number: string; client_name: string; minutes: number; cost: number }> = {};

  for (const session of sessionsResult.rows) {
    if (!orderSummary[session.order_id]) {
      orderSummary[session.order_id] = {
        order_number: session.order_number,
        client_name: session.client_name,
        minutes: 0,
        cost: 0,
      };
    }
    orderSummary[session.order_id].minutes += parseFloat(session.duration_minutes) || 0;
    orderSummary[session.order_id].cost += parseFloat(session.cost) || 0;
  }

  res.json({
    success: true,
    data: {
      worker,
      period: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
      sessions: sessionsResult.rows,
      order_summary: Object.values(orderSummary),
      totals: {
        total_minutes: Math.round(totalMinutes),
        total_hours: (totalMinutes / 60).toFixed(2),
        total_cost: totalCost.toFixed(2),
      },
    },
  });
});

// GET /api/reports/export/worker/:workerId
export const exportWorkerReport = asyncHandler(async (req: Request, res: Response) => {
  const { workerId } = req.params;
  const { from, to } = req.query;

  // Validate dates
  let fromDate = from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  let toDate = to ? new Date(to as string) : new Date();

  // Get worker
  const workerResult = await query(
    'SELECT id, name, email, position, hourly_rate FROM workers WHERE id = $1',
    [workerId]
  );

  if (workerResult.rows.length === 0) {
    throw new AppError('Worker not found', 404);
  }

  const worker = workerResult.rows[0];

  // Get work sessions
  const sessionsResult = await query(
    `SELECT
      ws.*,
      s.stage_name,
      o.order_number,
      o.client_name,
      o.product_name
    FROM work_sessions ws
    JOIN assignments a ON ws.assignment_id = a.id
    JOIN stages s ON a.stage_id = s.id
    JOIN orders o ON s.order_id = o.id
    WHERE a.worker_id = $1
      AND ws.start_time >= $2
      AND ws.start_time <= $3
    ORDER BY ws.start_time DESC`,
    [workerId, fromDate, toDate]
  );

  // Generate CSV
  const headers = [
    'Data',
    'Zlecenie',
    'Klient',
    'Etap',
    'Rozpoczecie',
    'Zakonczenie',
    'Czas (minuty)',
    'Koszt',
  ];

  let csvContent = headers.join(';') + '\n';

  for (const session of sessionsResult.rows) {
    const row = [
      session.start_time ? new Date(session.start_time).toLocaleDateString('pl-PL') : '',
      session.order_number,
      session.client_name,
      session.stage_name,
      session.start_time ? new Date(session.start_time).toLocaleTimeString('pl-PL') : '',
      session.end_time ? new Date(session.end_time).toLocaleTimeString('pl-PL') : '',
      session.duration_minutes ? Math.round(session.duration_minutes) : 0,
      session.cost ? parseFloat(session.cost).toFixed(2) : '0.00',
    ];
    csvContent += row.join(';') + '\n';
  }

  // Add summary
  const totalMinutes = sessionsResult.rows.reduce(
    (sum, s) => sum + (parseFloat(s.duration_minutes) || 0),
    0
  );
  const totalCost = sessionsResult.rows.reduce(
    (sum, s) => sum + (parseFloat(s.cost) || 0),
    0
  );

  csvContent += '\n';
  csvContent += `PODSUMOWANIE;;;;;;;;\n`;
  csvContent += `Pracownik;${worker.name};;;;;;;\n`;
  csvContent += `Okres;${fromDate.toLocaleDateString('pl-PL')} - ${toDate.toLocaleDateString('pl-PL')};;;;;;;\n`;
  csvContent += `Laczny czas (godziny);${(totalMinutes / 60).toFixed(2)};;;;;;;\n`;
  csvContent += `Laczny koszt;${totalCost.toFixed(2)} PLN;;;;;;;\n`;

  // Set headers for file download
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="raport_pracownik_${worker.name.replace(/\s/g, '_')}.csv"`
  );

  // Add BOM for Excel to recognize UTF-8
  res.send('\ufeff' + csvContent);
});

// GET /api/reports/summary
export const getSummaryReport = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = req.query;

  let fromDate = from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  let toDate = to ? new Date(to as string) : new Date();

  // Orders summary
  const ordersResult = await query(
    `SELECT
      COUNT(*) FILTER (WHERE status = 'NOWE') as new_orders,
      COUNT(*) FILTER (WHERE status = 'W_TRAKCIE') as in_progress_orders,
      COUNT(*) FILTER (WHERE status = 'GOTOWE') as completed_orders,
      COUNT(*) as total_orders
    FROM orders
    WHERE created_at >= $1 AND created_at <= $2 AND archived = false`,
    [fromDate, toDate]
  );

  // Workers summary
  const workersResult = await query(
    `SELECT
      w.id,
      w.name,
      w.position,
      COALESCE(SUM(ws.duration_minutes), 0) as total_minutes,
      COALESCE(SUM(ws.cost), 0) as total_cost
    FROM workers w
    LEFT JOIN assignments a ON w.id = a.worker_id
    LEFT JOIN work_sessions ws ON a.id = ws.assignment_id AND ws.start_time >= $1 AND ws.start_time <= $2
    WHERE w.active = true
    GROUP BY w.id, w.name, w.position
    ORDER BY total_minutes DESC`,
    [fromDate, toDate]
  );

  // Total labor cost
  const totalCostResult = await query(
    `SELECT COALESCE(SUM(ws.cost), 0) as total_labor_cost
    FROM work_sessions ws
    WHERE ws.start_time >= $1 AND ws.start_time <= $2`,
    [fromDate, toDate]
  );

  res.json({
    success: true,
    data: {
      period: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
      orders: ordersResult.rows[0],
      workers: workersResult.rows.map((w) => ({
        ...w,
        total_minutes: parseFloat(w.total_minutes) || 0,
        total_hours: ((parseFloat(w.total_minutes) || 0) / 60).toFixed(2),
        total_cost: parseFloat(w.total_cost) || 0,
      })),
      total_labor_cost: parseFloat(totalCostResult.rows[0].total_labor_cost) || 0,
    },
  });
});
