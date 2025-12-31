import { Request, Response } from 'express';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

// Get cost calculation for an order
export const getOrderCost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get order details
    const orderResult = await pool.query(`
      SELECT
        o.id,
        o.order_number,
        o.product_name,
        o.quantity,
        o.unit,
        o.price_per_unit,
        o.price_total,
        o.material_cost,
        o.notes
      FROM orders o
      WHERE o.id = $1
    `, [id]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Get material costs from BOM if available
    const bomResult = await pool.query(`
      SELECT
        ob.id as bom_id,
        ob.total_material_cost as bom_total,
        COALESCE(
          (SELECT SUM(COALESCE(obi.unit_cost, 0) * COALESCE(obi.quantity_used, obi.quantity_planned, 0) * (1 + COALESCE(obi.waste_percentage, 0) / 100))
           FROM order_bom_items obi
           WHERE obi.order_bom_id = ob.id), 0
        ) as calculated_material_cost,
        (SELECT json_agg(json_build_object(
          'name', obi.name,
          'quantity', COALESCE(obi.quantity_used, obi.quantity_planned),
          'unit', obi.unit,
          'unit_cost', obi.unit_cost,
          'total', obi.total_cost
        )) FROM order_bom_items obi WHERE obi.order_bom_id = ob.id) as items
      FROM order_bom ob
      WHERE ob.order_id = $1
    `, [id]);

    const bomData = bomResult.rows[0] || null;

    // Get labor cost from work sessions
    const laborResult = await pool.query(`
      SELECT
        SUM(
          CASE WHEN ws.end_time IS NOT NULL
          THEN EXTRACT(EPOCH FROM (ws.end_time - ws.start_time)) / 3600
          ELSE 0 END
        ) as total_hours,
        COUNT(DISTINCT ws.worker_id) as workers_count
      FROM work_sessions ws
      JOIN stages s ON ws.stage_id = s.id
      WHERE s.order_id = $1
    `, [id]);

    const laborHours = parseFloat(laborResult.rows[0]?.total_hours) || 0;
    const workersCount = parseInt(laborResult.rows[0]?.workers_count) || 0;

    // Get machine usage
    const machineResult = await pool.query(`
      SELECT
        m.name as machine_name,
        m.cost_per_hour as hourly_rate,
        SUM(
          CASE WHEN ws.end_time IS NOT NULL
          THEN EXTRACT(EPOCH FROM (ws.end_time - ws.start_time)) / 3600
          ELSE 0 END
        ) as machine_hours
      FROM work_sessions ws
      JOIN stages s ON ws.stage_id = s.id
      LEFT JOIN machines m ON ws.machine_id = m.id
      WHERE s.order_id = $1 AND m.id IS NOT NULL
      GROUP BY m.id, m.name, m.cost_per_hour
    `, [id]);

    // Default rates (can be configured in settings)
    const LABOR_RATE_PER_HOUR = 50; // PLN per hour
    const DEFAULT_MACHINE_RATE = 100; // PLN per hour if not set

    // Calculate costs
    const laborCost = laborHours * LABOR_RATE_PER_HOUR;

    let machineCost = 0;
    const machineBreakdown = machineResult.rows.map((m: any) => {
      const hours = parseFloat(m.machine_hours) || 0;
      const rate = parseFloat(m.hourly_rate) || DEFAULT_MACHINE_RATE;
      const cost = hours * rate;
      machineCost += cost;
      return {
        machine: m.machine_name,
        hours: hours,
        rate: rate,
        cost: cost
      };
    });

    // Use BOM cost if available, otherwise fall back to order.material_cost
    const bomMaterialCost = bomData ? parseFloat(bomData.calculated_material_cost) || parseFloat(bomData.bom_total) || 0 : 0;
    const orderMaterialCost = parseFloat(order.material_cost) || 0;
    const materialCost = bomMaterialCost > 0 ? bomMaterialCost : orderMaterialCost;

    const totalCost = materialCost + laborCost + machineCost;
    const revenue = parseFloat(order.price_total) || 0;
    const profit = revenue - totalCost;
    const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;

    res.json({
      success: true,
      data: {
        order: {
          id: order.id,
          order_number: order.order_number,
          product_name: order.product_name,
          quantity: order.quantity,
          unit: order.unit
        },
        costs: {
          material: {
            cost: materialCost,
            bom_items: bomData?.items || null,
            has_bom: !!bomData,
            description: bomData ? 'Koszt materiałów (z BOM)' : 'Koszt materiałów'
          },
          labor: {
            hours: laborHours,
            rate: LABOR_RATE_PER_HOUR,
            workers: workersCount,
            cost: laborCost,
            description: 'Koszt robocizny'
          },
          machine: {
            breakdown: machineBreakdown,
            total: machineCost,
            description: 'Koszt maszyn'
          },
          total: totalCost
        },
        pricing: {
          unit_price: parseFloat(order.price_per_unit) || 0,
          total_revenue: revenue,
          cost_per_unit: order.quantity > 0 ? totalCost / order.quantity : 0
        },
        profitability: {
          profit: profit,
          margin_percent: Math.round(marginPercent * 100) / 100,
          status: marginPercent >= 30 ? 'good' : marginPercent >= 15 ? 'acceptable' : 'low'
        }
      }
    });
  } catch (error) {
    logger.error('Error calculating order cost:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate order cost'
    });
  }
};

// Update material cost for an order
export const updateMaterialCost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { material_cost } = req.body;

    await pool.query(`
      UPDATE orders SET material_cost = $1, updated_at = NOW()
      WHERE id = $2
    `, [material_cost, id]);

    res.json({
      success: true,
      message: 'Material cost updated'
    });
  } catch (error) {
    logger.error('Error updating material cost:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update material cost'
    });
  }
};

// Get cost summary for multiple orders (report)
export const getCostSummary = async (req: Request, res: Response) => {
  try {
    const { from_date, to_date } = req.query;

    const fromDate = from_date ? new Date(from_date as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to_date ? new Date(to_date as string) : new Date();

    const LABOR_RATE_PER_HOUR = 50;

    // Get orders with costs
    const ordersResult = await pool.query(`
      SELECT
        o.id,
        o.order_number,
        o.product_name,
        o.quantity,
        o.price_total,
        o.material_cost,
        o.status,
        COALESCE(
          (SELECT SUM(
            CASE WHEN ws.end_time IS NOT NULL
            THEN EXTRACT(EPOCH FROM (ws.end_time - ws.start_time)) / 3600
            ELSE 0 END
          ) FROM work_sessions ws
          JOIN stages s ON ws.stage_id = s.id
          WHERE s.order_id = o.id), 0
        ) as labor_hours
      FROM orders o
      WHERE o.created_at >= $1 AND o.created_at <= $2
        AND o.archived = false
      ORDER BY o.created_at DESC
    `, [fromDate, toDate]);

    let totalRevenue = 0;
    let totalMaterialCost = 0;
    let totalLaborCost = 0;
    let totalLaborHours = 0;

    const orders = ordersResult.rows.map((o: any) => {
      const materialCost = parseFloat(o.material_cost) || 0;
      const laborHours = parseFloat(o.labor_hours) || 0;
      const laborCost = laborHours * LABOR_RATE_PER_HOUR;
      const totalCost = materialCost + laborCost;
      const revenue = parseFloat(o.price_total) || 0;
      const profit = revenue - totalCost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      totalRevenue += revenue;
      totalMaterialCost += materialCost;
      totalLaborCost += laborCost;
      totalLaborHours += laborHours;

      return {
        id: o.id,
        order_number: o.order_number,
        product_name: o.product_name,
        quantity: o.quantity,
        status: o.status,
        revenue: revenue,
        material_cost: materialCost,
        labor_hours: laborHours,
        labor_cost: laborCost,
        total_cost: totalCost,
        profit: profit,
        margin: Math.round(margin * 100) / 100
      };
    });

    const totalCost = totalMaterialCost + totalLaborCost;
    const totalProfit = totalRevenue - totalCost;
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    res.json({
      success: true,
      data: {
        period: {
          from: fromDate.toISOString(),
          to: toDate.toISOString()
        },
        summary: {
          total_orders: orders.length,
          total_revenue: totalRevenue,
          total_material_cost: totalMaterialCost,
          total_labor_hours: totalLaborHours,
          total_labor_cost: totalLaborCost,
          total_cost: totalCost,
          total_profit: totalProfit,
          average_margin: Math.round(avgMargin * 100) / 100
        },
        orders
      }
    });
  } catch (error) {
    logger.error('Error getting cost summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cost summary'
    });
  }
};

// Quote calculator - estimate cost for new order
export const calculateQuote = async (req: Request, res: Response) => {
  try {
    const {
      product_type,
      quantity,
      material_type,
      material_quantity,
      stages
    } = req.body;

    // Material prices (could be from database/settings)
    const MATERIAL_PRICES: { [key: string]: number } = {
      'plexi_clear_3mm': 120, // PLN per m2
      'plexi_clear_5mm': 180,
      'plexi_clear_10mm': 350,
      'plexi_color_3mm': 150,
      'plexi_color_5mm': 220,
      'dibond_3mm': 200,
      'pcv_3mm': 80,
      'pcv_5mm': 120,
      'other': 100
    };

    // Stage costs (PLN per hour)
    const STAGE_RATES: { [key: string]: number } = {
      'ciecie_laser': 150,
      'frezowanie_cnc': 120,
      'giecie': 80,
      'klejenie': 60,
      'montaz': 50,
      'pakowanie': 30
    };

    const LABOR_RATE = 50;
    const MARGIN_TARGET = 0.30; // 30% target margin

    // Calculate material cost
    const materialPrice = MATERIAL_PRICES[material_type] || MATERIAL_PRICES['other'];
    const materialCost = materialPrice * (material_quantity || 1);

    // Calculate stage costs
    let stageCost = 0;
    let totalHours = 0;
    const stageBreakdown: any[] = [];

    if (stages && Array.isArray(stages)) {
      stages.forEach((stage: any) => {
        const rate = STAGE_RATES[stage.type] || 100;
        const hours = stage.estimated_hours || 1;
        const cost = rate * hours;
        stageCost += cost;
        totalHours += hours;
        stageBreakdown.push({
          stage: stage.type,
          hours: hours,
          rate: rate,
          cost: cost
        });
      });
    }

    const laborCost = totalHours * LABOR_RATE;
    const totalCost = materialCost + stageCost + laborCost;

    // Calculate price with margin
    const suggestedPrice = totalCost / (1 - MARGIN_TARGET);
    const unitPrice = quantity > 0 ? suggestedPrice / quantity : suggestedPrice;

    res.json({
      success: true,
      data: {
        input: {
          product_type,
          quantity,
          material_type,
          material_quantity
        },
        costs: {
          material: {
            type: material_type,
            quantity: material_quantity,
            unit_price: materialPrice,
            total: materialCost
          },
          stages: stageBreakdown,
          stage_total: stageCost,
          labor: {
            hours: totalHours,
            rate: LABOR_RATE,
            total: laborCost
          },
          total: totalCost
        },
        pricing: {
          target_margin: MARGIN_TARGET * 100,
          suggested_total: Math.ceil(suggestedPrice),
          suggested_unit_price: Math.ceil(unitPrice),
          cost_per_unit: quantity > 0 ? totalCost / quantity : totalCost
        }
      }
    });
  } catch (error) {
    logger.error('Error calculating quote:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate quote'
    });
  }
};
