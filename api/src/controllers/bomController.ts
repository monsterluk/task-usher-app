import { Request, Response } from 'express';
import { query, getClient } from '../config/database';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { logAudit, getAuditContextFromRequest } from '../services/auditService';

// ============ BOM TEMPLATES ============

// GET /api/bom/templates
export const getBomTemplates = asyncHandler(async (req: Request, res: Response) => {
  const { category, active, search } = req.query;

  let sql = `
    SELECT bt.*,
           (SELECT COUNT(*) FROM bom_template_items bti WHERE bti.template_id = bt.id) as items_count,
           w.name as created_by_name
    FROM bom_templates bt
    LEFT JOIN workers w ON bt.created_by = w.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (category) {
    sql += ` AND bt.product_category = $${paramIndex}`;
    params.push(category);
    paramIndex++;
  }

  if (active !== undefined) {
    sql += ` AND bt.is_active = $${paramIndex}`;
    params.push(active === 'true');
    paramIndex++;
  }

  if (search) {
    sql += ` AND (bt.name ILIKE $${paramIndex} OR bt.description ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  sql += ' ORDER BY bt.name ASC';

  const result = await query(sql, params);

  res.json({
    success: true,
    data: { templates: result.rows },
  });
});

// GET /api/bom/templates/:id
export const getBomTemplateById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const templateResult = await query(
    `SELECT bt.*, w.name as created_by_name
     FROM bom_templates bt
     LEFT JOIN workers w ON bt.created_by = w.id
     WHERE bt.id = $1`,
    [id]
  );

  if (templateResult.rows.length === 0) {
    throw new AppError('Szablon BOM nie znaleziony', 404);
  }

  // Get template items
  const itemsResult = await query(
    `SELECT * FROM bom_template_items WHERE template_id = $1 ORDER BY sequence_order, name`,
    [id]
  );

  // Calculate totals
  const totals = itemsResult.rows.reduce(
    (acc: any, item: any) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitCost = parseFloat(item.unit_cost) || 0;
      const wastePct = parseFloat(item.waste_percentage) || 0;
      const effectiveQuantity = quantity * (1 + wastePct / 100);
      const itemCost = effectiveQuantity * unitCost;

      if (item.item_type === 'labor') {
        acc.labor_hours += quantity;
        acc.labor_cost += itemCost;
      } else {
        acc.material_cost += itemCost;
      }
      acc.total_cost += itemCost;
      return acc;
    },
    { material_cost: 0, labor_hours: 0, labor_cost: 0, total_cost: 0 }
  );

  res.json({
    success: true,
    data: {
      template: templateResult.rows[0],
      items: itemsResult.rows,
      totals,
    },
  });
});

// POST /api/bom/templates
export const createBomTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, description, product_category, version, items } = req.body;

  if (!name) {
    throw new AppError('Nazwa szablonu jest wymagana', 400);
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Create template
    const templateResult = await client.query(
      `INSERT INTO bom_templates (name, description, product_category, version, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, description, product_category, version || '1.0', req.user?.id]
    );

    const template = templateResult.rows[0];

    // Add items if provided
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await client.query(
          `INSERT INTO bom_template_items
           (template_id, item_type, name, description, sku, unit, quantity, unit_cost, waste_percentage, supplier, lead_time_days, is_critical, sequence_order, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            template.id,
            item.item_type || 'material',
            item.name,
            item.description,
            item.sku,
            item.unit,
            item.quantity,
            item.unit_cost,
            item.waste_percentage || 0,
            item.supplier,
            item.lead_time_days,
            item.is_critical || false,
            i + 1,
            item.notes,
          ]
        );
      }
    }

    await client.query('COMMIT');

    await logAudit({
      tableName: 'bom_templates',
      recordId: template.id,
      action: 'CREATE',
      newValues: template,
      context: getAuditContextFromRequest(req),
    });

    logger.info(`BOM template created: ${name}`);

    res.status(201).json({
      success: true,
      data: { template },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// PUT /api/bom/templates/:id
export const updateBomTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, description, product_category, version, is_active } = req.body;

  const existingResult = await query('SELECT * FROM bom_templates WHERE id = $1', [id]);

  if (existingResult.rows.length === 0) {
    throw new AppError('Szablon BOM nie znaleziony', 404);
  }

  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const fields: Record<string, any> = { name, description, product_category, version, is_active };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      updates.push(`${key} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  }

  if (updates.length === 0) {
    throw new AppError('Brak pól do aktualizacji', 400);
  }

  updates.push(`updated_at = NOW()`);
  params.push(id);

  const result = await query(
    `UPDATE bom_templates SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  await logAudit({
    tableName: 'bom_templates',
    recordId: Number(id),
    action: 'UPDATE',
    oldValues: existingResult.rows[0],
    newValues: result.rows[0],
    context: getAuditContextFromRequest(req),
  });

  res.json({
    success: true,
    data: { template: result.rows[0] },
  });
});

// DELETE /api/bom/templates/:id
export const deleteBomTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const existingResult = await query('SELECT * FROM bom_templates WHERE id = $1', [id]);

  if (existingResult.rows.length === 0) {
    throw new AppError('Szablon BOM nie znaleziony', 404);
  }

  await logAudit({
    tableName: 'bom_templates',
    recordId: Number(id),
    action: 'DELETE',
    oldValues: existingResult.rows[0],
    context: getAuditContextFromRequest(req),
  });

  await query('DELETE FROM bom_templates WHERE id = $1', [id]);

  logger.info(`BOM template deleted: ${id}`);

  res.json({
    success: true,
    message: 'Szablon BOM usunięty',
  });
});

// ============ BOM TEMPLATE ITEMS ============

// POST /api/bom/templates/:templateId/items
export const addBomTemplateItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { templateId } = req.params;
  const { item_type, name, description, sku, unit, quantity, unit_cost, waste_percentage, supplier, lead_time_days, is_critical, notes } = req.body;

  if (!name || !unit || quantity === undefined) {
    throw new AppError('Nazwa, jednostka i ilość są wymagane', 400);
  }

  // Check template exists
  const templateResult = await query('SELECT id FROM bom_templates WHERE id = $1', [templateId]);
  if (templateResult.rows.length === 0) {
    throw new AppError('Szablon BOM nie znaleziony', 404);
  }

  // Get max sequence order
  const maxOrderResult = await query(
    'SELECT COALESCE(MAX(sequence_order), 0) + 1 as next_order FROM bom_template_items WHERE template_id = $1',
    [templateId]
  );

  const result = await query(
    `INSERT INTO bom_template_items
     (template_id, item_type, name, description, sku, unit, quantity, unit_cost, waste_percentage, supplier, lead_time_days, is_critical, sequence_order, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *`,
    [
      templateId,
      item_type || 'material',
      name,
      description,
      sku,
      unit,
      quantity,
      unit_cost,
      waste_percentage || 0,
      supplier,
      lead_time_days,
      is_critical || false,
      maxOrderResult.rows[0].next_order,
      notes,
    ]
  );

  res.status(201).json({
    success: true,
    data: { item: result.rows[0] },
  });
});

// PUT /api/bom/template-items/:id
export const updateBomTemplateItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { item_type, name, description, sku, unit, quantity, unit_cost, waste_percentage, supplier, lead_time_days, is_critical, sequence_order, notes } = req.body;

  const existingResult = await query('SELECT * FROM bom_template_items WHERE id = $1', [id]);

  if (existingResult.rows.length === 0) {
    throw new AppError('Pozycja BOM nie znaleziona', 404);
  }

  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const fields: Record<string, any> = {
    item_type, name, description, sku, unit, quantity, unit_cost,
    waste_percentage, supplier, lead_time_days, is_critical, sequence_order, notes
  };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      updates.push(`${key} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  }

  if (updates.length === 0) {
    throw new AppError('Brak pól do aktualizacji', 400);
  }

  updates.push(`updated_at = NOW()`);
  params.push(id);

  const result = await query(
    `UPDATE bom_template_items SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  res.json({
    success: true,
    data: { item: result.rows[0] },
  });
});

// DELETE /api/bom/template-items/:id
export const deleteBomTemplateItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const existingResult = await query('SELECT id FROM bom_template_items WHERE id = $1', [id]);

  if (existingResult.rows.length === 0) {
    throw new AppError('Pozycja BOM nie znaleziona', 404);
  }

  await query('DELETE FROM bom_template_items WHERE id = $1', [id]);

  res.json({
    success: true,
    message: 'Pozycja BOM usunięta',
  });
});

// ============ ORDER BOM ============

// GET /api/orders/:orderId/bom
export const getOrderBom = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;

  const bomResult = await query(
    `SELECT ob.*, bt.name as template_name, w1.name as created_by_name, w2.name as confirmed_by_name
     FROM order_bom ob
     LEFT JOIN bom_templates bt ON ob.template_id = bt.id
     LEFT JOIN workers w1 ON ob.created_by = w1.id
     LEFT JOIN workers w2 ON ob.confirmed_by = w2.id
     WHERE ob.order_id = $1`,
    [orderId]
  );

  if (bomResult.rows.length === 0) {
    return res.json({
      success: true,
      data: { bom: null, items: [], totals: null },
    });
  }

  const bom = bomResult.rows[0];

  // Get BOM items - alias fields for frontend compatibility
  const itemsResult = await query(
    `SELECT obi.id, obi.name as material_name, obi.item_type as material_type,
            obi.quantity_planned as quantity, obi.unit, obi.unit_cost as unit_price,
            (obi.quantity_planned * COALESCE(obi.unit_cost, 0)) as total_price,
            obi.notes, obi.is_issued as is_consumed, obi.created_at,
            obi.material_id, obi.inventory_item_id, obi.reservation_id,
            obi.quantity_used, obi.waste_quantity, obi.batch_number, obi.issued_at,
            w.name as issued_by_name, m.code as material_code
     FROM order_bom_items obi
     LEFT JOIN workers w ON obi.issued_by = w.id
     LEFT JOIN materials m ON obi.material_id = m.id
     WHERE obi.order_bom_id = $1
     ORDER BY obi.item_type, obi.name`,
    [bom.id]
  );

  // Calculate totals (using aliased field names)
  const totals = itemsResult.rows.reduce(
    (acc: any, item: any) => {
      const totalCost = parseFloat(item.total_price) || 0;
      const quantityUsed = parseFloat(item.quantity_used) || 0;
      const quantity = parseFloat(item.quantity) || 0;

      if (item.material_type === 'labor') {
        acc.labor_cost += totalCost;
        acc.labor_hours_planned += quantity;
        acc.labor_hours_used += quantityUsed;
      } else {
        acc.material_cost += totalCost;
      }
      acc.total_cost += totalCost;
      acc.items_count++;
      if (item.is_consumed) acc.issued_count++;
      return acc;
    },
    { material_cost: 0, labor_cost: 0, labor_hours_planned: 0, labor_hours_used: 0, total_cost: 0, items_count: 0, issued_count: 0 }
  );

  res.json({
    success: true,
    data: { bom, items: itemsResult.rows, totals },
  });
});

// POST /api/orders/:orderId/bom
export const createOrderBom = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { orderId } = req.params;
  const { template_id, items, notes } = req.body;

  // Check order exists
  const orderResult = await query('SELECT id, order_number FROM orders WHERE id = $1', [orderId]);
  if (orderResult.rows.length === 0) {
    throw new AppError('Zlecenie nie znalezione', 404);
  }

  // Check if BOM already exists for this order
  const existingBom = await query('SELECT id FROM order_bom WHERE order_id = $1', [orderId]);
  if (existingBom.rows.length > 0) {
    throw new AppError('BOM już istnieje dla tego zlecenia', 400);
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Create order BOM
    const bomResult = await client.query(
      `INSERT INTO order_bom (order_id, template_id, notes, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [orderId, template_id, notes, req.user?.id]
    );

    const bom = bomResult.rows[0];

    // If template_id provided, copy items from template
    if (template_id) {
      const templateItems = await client.query(
        'SELECT * FROM bom_template_items WHERE template_id = $1 ORDER BY sequence_order',
        [template_id]
      );

      for (const item of templateItems.rows) {
        await client.query(
          `INSERT INTO order_bom_items
           (order_bom_id, template_item_id, item_type, name, description, sku, unit, quantity_planned, unit_cost, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            bom.id,
            item.id,
            item.item_type,
            item.name,
            item.description,
            item.sku,
            item.unit,
            item.quantity,
            item.unit_cost,
            item.notes,
          ]
        );
      }
    }

    // Add custom items if provided
    if (items && items.length > 0) {
      for (const item of items) {
        await client.query(
          `INSERT INTO order_bom_items
           (order_bom_id, item_type, name, description, sku, unit, quantity_planned, unit_cost, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            bom.id,
            item.item_type || 'material',
            item.name,
            item.description,
            item.sku,
            item.unit,
            item.quantity_planned,
            item.unit_cost,
            item.notes,
          ]
        );
      }
    }

    await client.query('COMMIT');

    await logAudit({
      tableName: 'order_bom',
      recordId: bom.id,
      action: 'CREATE',
      newValues: bom,
      context: getAuditContextFromRequest(req),
    });

    logger.info(`Order BOM created for order ${orderId}`);

    res.status(201).json({
      success: true,
      data: { bom },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// POST /api/orders/:orderId/bom - Smart handler: creates BOM if needed, then adds item
export const createOrderBomOrAddItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { orderId } = req.params;
  const {
    // Single item fields
    material_name, material_type, quantity, unit, unit_price, supplier, notes, material_id,
    // Full BOM creation fields
    template_id, items
  } = req.body;

  // Check order exists
  const orderResult = await query('SELECT id, order_number FROM orders WHERE id = $1', [orderId]);
  if (orderResult.rows.length === 0) {
    throw new AppError('Zlecenie nie znalezione', 404);
  }

  // Check if this is a single item addition or full BOM creation
  const isSingleItem = material_name || (quantity !== undefined && unit);

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Check if BOM already exists for this order
    let bomResult = await client.query('SELECT id FROM order_bom WHERE order_id = $1', [orderId]);
    let bomId: number;

    if (bomResult.rows.length === 0) {
      // Create the BOM first
      const newBomResult = await client.query(
        `INSERT INTO order_bom (order_id, template_id, notes, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [orderId, template_id || null, isSingleItem ? null : notes, req.user?.id]
      );
      bomId = newBomResult.rows[0].id;

      await logAudit({
        tableName: 'order_bom',
        recordId: bomId,
        action: 'CREATE',
        newValues: newBomResult.rows[0],
        context: getAuditContextFromRequest(req),
      });

      // If template_id provided, copy items from template
      if (template_id) {
        const templateItems = await client.query(
          'SELECT * FROM bom_template_items WHERE template_id = $1 ORDER BY sequence_order',
          [template_id]
        );

        for (const item of templateItems.rows) {
          await client.query(
            `INSERT INTO order_bom_items
             (order_bom_id, template_item_id, item_type, name, description, sku, unit, quantity_planned, unit_cost, notes, material_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [bomId, item.id, item.item_type, item.name, item.description, item.sku, item.unit, item.quantity, item.unit_cost, item.notes, item.material_id]
          );
        }
      }

      // Add custom items if provided (for full BOM creation)
      if (items && items.length > 0) {
        for (const item of items) {
          await client.query(
            `INSERT INTO order_bom_items
             (order_bom_id, item_type, name, description, sku, unit, quantity_planned, unit_cost, notes, material_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [bomId, item.item_type || 'material', item.name, item.description, item.sku, item.unit, item.quantity_planned, item.unit_cost, item.notes, item.material_id]
          );
        }
      }
    } else {
      bomId = bomResult.rows[0].id;
    }

    // If this is a single item addition
    let newItem = null;
    if (isSingleItem) {
      // If material_id provided, get material details
      let materialData: any = null;
      if (material_id) {
        const materialResult = await client.query(
          'SELECT code, name, unit, unit_cost FROM materials WHERE id = $1',
          [material_id]
        );
        if (materialResult.rows.length > 0) {
          materialData = materialResult.rows[0];
        }
      }

      const itemResult = await client.query(
        `INSERT INTO order_bom_items
         (order_bom_id, item_type, name, description, sku, unit, quantity_planned, unit_cost, notes, material_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          bomId,
          material_type || 'material',
          materialData?.name || material_name,
          null, // description
          materialData?.code || null, // sku
          materialData?.unit || unit,
          quantity || 1,
          unit_price || materialData?.unit_cost || 0,
          notes || null,
          material_id || null,
        ]
      );
      newItem = itemResult.rows[0];

      await logAudit({
        tableName: 'order_bom_items',
        recordId: newItem.id,
        action: 'CREATE',
        newValues: newItem,
        context: getAuditContextFromRequest(req),
      });

      logger.info(`BOM item added to order ${orderId}: ${material_name || materialData?.name}`);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: newItem ? { item: newItem, bomId } : { bomId },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// PUT /api/orders/:orderId/bom
export const updateOrderBom = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { orderId } = req.params;
  const { status, notes } = req.body;

  const existingResult = await query('SELECT * FROM order_bom WHERE order_id = $1', [orderId]);

  if (existingResult.rows.length === 0) {
    throw new AppError('BOM zlecenia nie znaleziony', 404);
  }

  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (status !== undefined) {
    updates.push(`status = $${paramIndex}`);
    params.push(status);
    paramIndex++;

    // If confirming, set confirmed_by and confirmed_at
    if (status === 'confirmed') {
      updates.push(`confirmed_by = $${paramIndex}`);
      params.push(req.user?.id);
      paramIndex++;
      updates.push(`confirmed_at = NOW()`);
    }
  }

  if (notes !== undefined) {
    updates.push(`notes = $${paramIndex}`);
    params.push(notes);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new AppError('Brak pól do aktualizacji', 400);
  }

  updates.push(`updated_at = NOW()`);
  params.push(existingResult.rows[0].id);

  const result = await query(
    `UPDATE order_bom SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  // Recalculate totals
  const itemsResult = await query(
    `SELECT item_type, SUM(total_cost) as type_total
     FROM order_bom_items WHERE order_bom_id = $1
     GROUP BY item_type`,
    [result.rows[0].id]
  );

  let materialCost = 0;
  let laborCost = 0;
  for (const row of itemsResult.rows) {
    if (row.item_type === 'labor') {
      laborCost = parseFloat(row.type_total) || 0;
    } else {
      materialCost += parseFloat(row.type_total) || 0;
    }
  }

  await query(
    `UPDATE order_bom SET total_material_cost = $1, total_labor_cost = $2, total_cost = $3 WHERE id = $4`,
    [materialCost, laborCost, materialCost + laborCost, result.rows[0].id]
  );

  await logAudit({
    tableName: 'order_bom',
    recordId: result.rows[0].id,
    action: 'UPDATE',
    oldValues: existingResult.rows[0],
    newValues: result.rows[0],
    context: getAuditContextFromRequest(req),
  });

  res.json({
    success: true,
    data: { bom: result.rows[0] },
  });
});

// ============ ORDER BOM ITEMS ============

// POST /api/order-bom/:bomId/items
export const addOrderBomItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { bomId } = req.params;
  const { item_type, name, description, sku, unit, quantity_planned, unit_cost, notes, material_id } = req.body;

  if (!name || !unit || quantity_planned === undefined) {
    throw new AppError('Nazwa, jednostka i ilość planowana są wymagane', 400);
  }

  const bomResult = await query('SELECT id, order_id FROM order_bom WHERE id = $1', [bomId]);
  if (bomResult.rows.length === 0) {
    throw new AppError('BOM zlecenia nie znaleziony', 404);
  }

  // If material_id provided, get material details
  let materialData: any = null;
  if (material_id) {
    const materialResult = await query(
      'SELECT code, name, unit, unit_cost FROM materials WHERE id = $1',
      [material_id]
    );
    if (materialResult.rows.length > 0) {
      materialData = materialResult.rows[0];
    }
  }

  const result = await query(
    `INSERT INTO order_bom_items
     (order_bom_id, item_type, name, description, sku, unit, quantity_planned, unit_cost, notes, material_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      bomId,
      item_type || 'material',
      materialData?.name || name,
      description,
      materialData?.code || sku,
      materialData?.unit || unit,
      quantity_planned,
      unit_cost || materialData?.unit_cost,
      notes,
      material_id
    ]
  );

  res.status(201).json({
    success: true,
    data: { item: result.rows[0] },
  });
});

// PUT /api/order-bom-items/:id
export const updateOrderBomItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { quantity_planned, quantity_used, unit_cost, batch_number, is_issued, notes } = req.body;

  const existingResult = await query('SELECT * FROM order_bom_items WHERE id = $1', [id]);

  if (existingResult.rows.length === 0) {
    throw new AppError('Pozycja BOM nie znaleziona', 404);
  }

  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (quantity_planned !== undefined) {
    updates.push(`quantity_planned = $${paramIndex}`);
    params.push(quantity_planned);
    paramIndex++;
  }

  if (quantity_used !== undefined) {
    updates.push(`quantity_used = $${paramIndex}`);
    params.push(quantity_used);
    paramIndex++;
  }

  if (unit_cost !== undefined) {
    updates.push(`unit_cost = $${paramIndex}`);
    params.push(unit_cost);
    paramIndex++;
  }

  if (batch_number !== undefined) {
    updates.push(`batch_number = $${paramIndex}`);
    params.push(batch_number);
    paramIndex++;
  }

  if (is_issued !== undefined) {
    updates.push(`is_issued = $${paramIndex}`);
    params.push(is_issued);
    paramIndex++;

    if (is_issued && !existingResult.rows[0].is_issued) {
      updates.push(`issued_at = NOW()`);
      updates.push(`issued_by = $${paramIndex}`);
      params.push(req.user?.id);
      paramIndex++;
    }
  }

  if (notes !== undefined) {
    updates.push(`notes = $${paramIndex}`);
    params.push(notes);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new AppError('Brak pól do aktualizacji', 400);
  }

  updates.push(`updated_at = NOW()`);
  params.push(id);

  const result = await query(
    `UPDATE order_bom_items SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  // Recalculate total_cost
  const item = result.rows[0];
  const qtyUsed = parseFloat(item.quantity_used) || parseFloat(item.quantity_planned) || 0;
  const unitCostVal = parseFloat(item.unit_cost) || 0;
  const totalCost = qtyUsed * unitCostVal;

  await query(
    'UPDATE order_bom_items SET total_cost = $1 WHERE id = $2',
    [totalCost, id]
  );

  res.json({
    success: true,
    data: { item: { ...result.rows[0], total_cost: totalCost } },
  });
});

// POST /api/order-bom-items/:id/issue - Issue material from inventory
export const issueBomItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { quantity_used, batch_number, waste_quantity, inventory_item_id } = req.body;

  const client = await getClient();

  try {
    await client.query('BEGIN');

    const existingResult = await client.query(
      `SELECT obi.*, ob.order_id, o.order_number
       FROM order_bom_items obi
       JOIN order_bom ob ON obi.order_bom_id = ob.id
       JOIN orders o ON ob.order_id = o.id
       WHERE obi.id = $1`,
      [id]
    );

    if (existingResult.rows.length === 0) {
      throw new AppError('Pozycja BOM nie znaleziona', 404);
    }

    const item = existingResult.rows[0];
    const qtyUsed = quantity_used !== undefined ? quantity_used : item.quantity_planned;
    const unitCostVal = parseFloat(item.unit_cost) || 0;
    const totalCost = parseFloat(qtyUsed) * unitCostVal;

    // If inventory_item_id provided, create WZ transaction
    let transactionNumber = null;
    const effectiveInventoryItemId = inventory_item_id || item.inventory_item_id;

    if (effectiveInventoryItemId) {
      // Check inventory availability
      const invResult = await client.query(
        'SELECT quantity, available_quantity, material_id, location_id, unit_cost FROM inventory_items WHERE id = $1',
        [effectiveInventoryItemId]
      );

      if (invResult.rows.length > 0) {
        const invItem = invResult.rows[0];
        const availableQty = parseFloat(invItem.available_quantity);

        if (qtyUsed > availableQty) {
          throw new AppError(`Niewystarczająca ilość w magazynie. Dostępne: ${availableQty}`, 400);
        }

        // Generate transaction number
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const countResult = await client.query(
          `SELECT COUNT(*) + 1 as next_num FROM inventory_transactions
           WHERE type = 'WZ' AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`
        );
        const nextNum = String(countResult.rows[0].next_num).padStart(4, '0');
        transactionNumber = `WZ/${year}/${month}/${nextNum}`;

        const quantityBefore = parseFloat(invItem.quantity);
        const quantityAfter = quantityBefore - qtyUsed;

        // Update inventory
        await client.query(
          'UPDATE inventory_items SET quantity = $1, updated_at = NOW() WHERE id = $2',
          [quantityAfter, effectiveInventoryItemId]
        );

        // Create WZ transaction
        await client.query(
          `INSERT INTO inventory_transactions
           (transaction_number, item_id, material_id, type, quantity,
            quantity_before, quantity_after, unit_cost, total_cost,
            from_location_id, reference_type, reference_id, reference_number, notes, worker_id)
           VALUES ($1, $2, $3, 'WZ', $4, $5, $6, $7, $8, $9, 'order', $10, $11, $12, $13)`,
          [
            transactionNumber,
            effectiveInventoryItemId,
            invItem.material_id,
            -qtyUsed,
            quantityBefore,
            quantityAfter,
            invItem.unit_cost || unitCostVal,
            qtyUsed * (invItem.unit_cost || unitCostVal),
            invItem.location_id,
            item.order_id,
            item.order_number,
            `Wydanie do BOM - ${item.name}`,
            req.user?.id
          ]
        );

        // If there was a reservation, update it
        if (item.reservation_id) {
          await client.query(
            `UPDATE material_reservations
             SET quantity_issued = quantity_issued + $1,
                 status = CASE
                   WHEN quantity_issued + $1 >= quantity_reserved THEN 'issued'
                   ELSE 'partially_issued'
                 END,
                 issued_by = $2, issued_at = NOW(), updated_at = NOW()
             WHERE id = $3`,
            [qtyUsed, req.user?.id, item.reservation_id]
          );

          // Release reservation from inventory
          await client.query(
            'UPDATE inventory_items SET reserved_quantity = reserved_quantity - $1 WHERE id = $2',
            [qtyUsed, effectiveInventoryItemId]
          );
        }
      }
    }

    // Update BOM item
    const result = await client.query(
      `UPDATE order_bom_items
       SET quantity_used = $1, batch_number = $2, waste_quantity = $3,
           is_issued = true, issued_at = NOW(), issued_by = $4,
           total_cost = $5, inventory_item_id = COALESCE($6, inventory_item_id), updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [qtyUsed, batch_number, waste_quantity, req.user?.id, totalCost, effectiveInventoryItemId, id]
    );

    await client.query('COMMIT');

    logger.info(`BOM item ${id} issued: ${qtyUsed} ${item.unit}${transactionNumber ? ` (${transactionNumber})` : ''}`);

    res.json({
      success: true,
      data: {
        item: result.rows[0],
        transaction_number: transactionNumber,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// POST /api/order-bom-items/:id/reserve - Reserve material from inventory
export const reserveBomItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { inventory_item_id, quantity } = req.body;

  if (!inventory_item_id) {
    throw new AppError('inventory_item_id jest wymagany', 400);
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Get BOM item
    const bomItemResult = await client.query(
      `SELECT obi.*, ob.order_id
       FROM order_bom_items obi
       JOIN order_bom ob ON obi.order_bom_id = ob.id
       WHERE obi.id = $1`,
      [id]
    );

    if (bomItemResult.rows.length === 0) {
      throw new AppError('Pozycja BOM nie znaleziona', 404);
    }

    const bomItem = bomItemResult.rows[0];
    const reserveQty = quantity || bomItem.quantity_planned;

    // Check inventory availability
    const invResult = await client.query(
      'SELECT available_quantity, material_id FROM inventory_items WHERE id = $1',
      [inventory_item_id]
    );

    if (invResult.rows.length === 0) {
      throw new AppError('Pozycja magazynowa nie znaleziona', 404);
    }

    const availableQty = parseFloat(invResult.rows[0].available_quantity);
    if (reserveQty > availableQty) {
      throw new AppError(`Niewystarczająca dostępna ilość. Dostępne: ${availableQty}`, 400);
    }

    // Update inventory reserved quantity
    await client.query(
      'UPDATE inventory_items SET reserved_quantity = reserved_quantity + $1, updated_at = NOW() WHERE id = $2',
      [reserveQty, inventory_item_id]
    );

    // Create reservation
    const reservationResult = await client.query(
      `INSERT INTO material_reservations
       (order_id, order_bom_item_id, inventory_item_id, quantity_reserved, reserved_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [bomItem.order_id, id, inventory_item_id, reserveQty, req.user?.id, `Rezerwacja dla BOM: ${bomItem.name}`]
    );

    // Create RESERVE transaction
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const countResult = await client.query(
      `SELECT COUNT(*) + 1 as next_num FROM inventory_transactions
       WHERE type = 'RESERVE' AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`
    );
    const nextNum = String(countResult.rows[0].next_num).padStart(4, '0');
    const transactionNumber = `RESERVE/${year}/${month}/${nextNum}`;

    await client.query(
      `INSERT INTO inventory_transactions
       (transaction_number, item_id, material_id, type, quantity, reference_type, reference_id, notes, worker_id)
       VALUES ($1, $2, $3, 'RESERVE', $4, 'order', $5, $6, $7)`,
      [
        transactionNumber,
        inventory_item_id,
        invResult.rows[0].material_id,
        reserveQty,
        bomItem.order_id,
        `Rezerwacja dla BOM: ${bomItem.name}`,
        req.user?.id
      ]
    );

    // Update BOM item with inventory and reservation links
    await client.query(
      `UPDATE order_bom_items
       SET inventory_item_id = $1, reservation_id = $2, material_id = $3, updated_at = NOW()
       WHERE id = $4`,
      [inventory_item_id, reservationResult.rows[0].id, invResult.rows[0].material_id, id]
    );

    await client.query('COMMIT');

    logger.info(`Reserved ${reserveQty} for BOM item ${id}`);

    res.json({
      success: true,
      message: `Zarezerwowano ${reserveQty} jednostek`,
      data: { reservation: reservationResult.rows[0] },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// DELETE /api/order-bom-items/:id
export const deleteOrderBomItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const existingResult = await query('SELECT id FROM order_bom_items WHERE id = $1', [id]);

  if (existingResult.rows.length === 0) {
    throw new AppError('Pozycja BOM nie znaleziona', 404);
  }

  await query('DELETE FROM order_bom_items WHERE id = $1', [id]);

  res.json({
    success: true,
    message: 'Pozycja BOM usunięta',
  });
});
