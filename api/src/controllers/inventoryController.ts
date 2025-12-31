import { Request, Response } from 'express';
import { query, getClient } from '../config/database';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';

// ============ MATERIAL CATEGORIES ============

// GET /api/inventory/categories
export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const { active } = req.query;

  let sql = 'SELECT * FROM material_categories WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (active !== undefined) {
    sql += ` AND is_active = $${paramIndex}`;
    params.push(active === 'true');
    paramIndex++;
  }

  sql += ' ORDER BY name ASC';

  const result = await query(sql, params);

  res.json({
    success: true,
    data: { categories: result.rows },
  });
});

// POST /api/inventory/categories
export const createCategory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, description, parent_id } = req.body;

  if (!name) {
    throw new AppError('Nazwa kategorii jest wymagana', 400);
  }

  const result = await query(
    `INSERT INTO material_categories (name, description, parent_id)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [name, description, parent_id]
  );

  logger.info(`Material category created: ${name}`);

  res.status(201).json({
    success: true,
    data: { category: result.rows[0] },
  });
});

// ============ MATERIALS (CATALOG) ============

// GET /api/inventory/materials
export const getMaterials = asyncHandler(async (req: Request, res: Response) => {
  const { category_id, active, search, low_stock } = req.query;

  let sql = `
    SELECT m.*, c.name as category_name,
           COALESCE(SUM(ii.quantity), 0) as total_stock,
           COALESCE(SUM(ii.reserved_quantity), 0) as total_reserved,
           COALESCE(SUM(ii.available_quantity), 0) as total_available
    FROM materials m
    LEFT JOIN material_categories c ON m.category_id = c.id
    LEFT JOIN inventory_items ii ON m.id = ii.material_id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (category_id) {
    sql += ` AND m.category_id = $${paramIndex}`;
    params.push(category_id);
    paramIndex++;
  }

  if (active !== undefined) {
    sql += ` AND m.is_active = $${paramIndex}`;
    params.push(active === 'true');
    paramIndex++;
  }

  if (search) {
    sql += ` AND (m.name ILIKE $${paramIndex} OR m.code ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  sql += ' GROUP BY m.id, c.name';

  if (low_stock === 'true') {
    sql += ' HAVING COALESCE(SUM(ii.quantity), 0) <= m.min_stock';
  }

  sql += ' ORDER BY m.name ASC';

  const result = await query(sql, params);

  res.json({
    success: true,
    data: { materials: result.rows },
  });
});

// GET /api/inventory/materials/:id
export const getMaterialById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const materialResult = await query(
    `SELECT m.*, c.name as category_name
     FROM materials m
     LEFT JOIN material_categories c ON m.category_id = c.id
     WHERE m.id = $1`,
    [id]
  );

  if (materialResult.rows.length === 0) {
    throw new AppError('Material nie znaleziony', 404);
  }

  // Get stock by location
  const stockResult = await query(
    `SELECT ii.*, sl.code as location_code, sl.name as location_name
     FROM inventory_items ii
     LEFT JOIN storage_locations sl ON ii.location_id = sl.id
     WHERE ii.material_id = $1
     ORDER BY sl.code`,
    [id]
  );

  // Get recent transactions
  const transactionsResult = await query(
    `SELECT it.*, w.name as worker_name
     FROM inventory_transactions it
     LEFT JOIN workers w ON it.worker_id = w.id
     WHERE it.material_id = $1
     ORDER BY it.created_at DESC
     LIMIT 20`,
    [id]
  );

  res.json({
    success: true,
    data: {
      material: materialResult.rows[0],
      stock: stockResult.rows,
      transactions: transactionsResult.rows,
    },
  });
});

// POST /api/inventory/materials
export const createMaterial = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    code, name, description, unit, category_id,
    thickness_mm, width_mm, height_mm, color,
    supplier, supplier_code, min_stock, max_stock,
    reorder_point, unit_cost
  } = req.body;

  if (!code || !name || !unit) {
    throw new AppError('Kod, nazwa i jednostka sa wymagane', 400);
  }

  // Check for duplicate code
  const existingResult = await query('SELECT id FROM materials WHERE code = $1', [code]);
  if (existingResult.rows.length > 0) {
    throw new AppError('Material o tym kodzie juz istnieje', 400);
  }

  const result = await query(
    `INSERT INTO materials (
      code, name, description, unit, category_id,
      thickness_mm, width_mm, height_mm, color,
      supplier, supplier_code, min_stock, max_stock,
      reorder_point, unit_cost, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *`,
    [
      code, name, description, unit, category_id,
      thickness_mm, width_mm, height_mm, color,
      supplier, supplier_code, min_stock || 0, max_stock,
      reorder_point, unit_cost, req.user?.id
    ]
  );

  logger.info(`Material created: ${code} - ${name}`);

  res.status(201).json({
    success: true,
    data: { material: result.rows[0] },
  });
});

// PUT /api/inventory/materials/:id
export const updateMaterial = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    name, description, unit, category_id,
    thickness_mm, width_mm, height_mm, color,
    supplier, supplier_code, min_stock, max_stock,
    reorder_point, unit_cost, is_active
  } = req.body;

  const existingResult = await query('SELECT id FROM materials WHERE id = $1', [id]);
  if (existingResult.rows.length === 0) {
    throw new AppError('Material nie znaleziony', 404);
  }

  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const fields: Record<string, any> = {
    name, description, unit, category_id,
    thickness_mm, width_mm, height_mm, color,
    supplier, supplier_code, min_stock, max_stock,
    reorder_point, unit_cost, is_active
  };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      updates.push(`${key} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  }

  if (updates.length === 0) {
    throw new AppError('Brak pol do aktualizacji', 400);
  }

  updates.push(`updated_at = NOW()`);
  params.push(id);

  const result = await query(
    `UPDATE materials SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  logger.info(`Material updated: ${id}`);

  res.json({
    success: true,
    data: { material: result.rows[0] },
  });
});

// ============ STORAGE LOCATIONS ============

// GET /api/inventory/locations
export const getLocations = asyncHandler(async (req: Request, res: Response) => {
  const { warehouse, zone, active } = req.query;

  let sql = 'SELECT * FROM storage_locations WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (warehouse) {
    sql += ` AND warehouse = $${paramIndex}`;
    params.push(warehouse);
    paramIndex++;
  }

  if (zone) {
    sql += ` AND zone = $${paramIndex}`;
    params.push(zone);
    paramIndex++;
  }

  if (active !== undefined) {
    sql += ` AND is_active = $${paramIndex}`;
    params.push(active === 'true');
    paramIndex++;
  }

  sql += ' ORDER BY code ASC';

  const result = await query(sql, params);

  res.json({
    success: true,
    data: { locations: result.rows },
  });
});

// POST /api/inventory/locations
export const createLocation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { code, name, warehouse, zone, aisle, rack, shelf, bin, capacity_max } = req.body;

  if (!code || !name) {
    throw new AppError('Kod i nazwa lokalizacji sa wymagane', 400);
  }

  const result = await query(
    `INSERT INTO storage_locations (code, name, warehouse, zone, aisle, rack, shelf, bin, capacity_max)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [code, name, warehouse || 'Magazyn glowny', zone, aisle, rack, shelf, bin, capacity_max]
  );

  logger.info(`Storage location created: ${code}`);

  res.status(201).json({
    success: true,
    data: { location: result.rows[0] },
  });
});

// ============ INVENTORY ITEMS (STOCK) ============

// GET /api/inventory/stock
export const getStock = asyncHandler(async (req: Request, res: Response) => {
  const { material_id, location_id, low_stock } = req.query;

  let sql = `
    SELECT ii.*,
           m.code as material_code, m.name as material_name, m.unit, m.min_stock,
           sl.code as location_code, sl.name as location_name
    FROM inventory_items ii
    JOIN materials m ON ii.material_id = m.id
    LEFT JOIN storage_locations sl ON ii.location_id = sl.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (material_id) {
    sql += ` AND ii.material_id = $${paramIndex}`;
    params.push(material_id);
    paramIndex++;
  }

  if (location_id) {
    sql += ` AND ii.location_id = $${paramIndex}`;
    params.push(location_id);
    paramIndex++;
  }

  if (low_stock === 'true') {
    sql += ' AND ii.quantity <= m.min_stock';
  }

  sql += ' ORDER BY m.name, sl.code';

  const result = await query(sql, params);

  res.json({
    success: true,
    data: { stock: result.rows },
  });
});

// GET /api/inventory/stock/summary
export const getStockSummary = asyncHandler(async (req: Request, res: Response) => {
  const summaryResult = await query(`
    SELECT
      COUNT(DISTINCT m.id) as total_materials,
      COUNT(DISTINCT ii.id) as total_stock_items,
      COALESCE(SUM(ii.total_value), 0) as total_value,
      COUNT(DISTINCT CASE WHEN ii.quantity <= m.min_stock THEN m.id END) as low_stock_count,
      COUNT(DISTINCT CASE WHEN ii.quantity = 0 THEN m.id END) as out_of_stock_count
    FROM materials m
    LEFT JOIN inventory_items ii ON m.id = ii.material_id
    WHERE m.is_active = true
  `);

  const lowStockResult = await query(`
    SELECT m.code, m.name, COALESCE(SUM(ii.quantity), 0) as current_stock, m.min_stock
    FROM materials m
    LEFT JOIN inventory_items ii ON m.id = ii.material_id
    WHERE m.is_active = true
    GROUP BY m.id
    HAVING COALESCE(SUM(ii.quantity), 0) <= m.min_stock
    ORDER BY (COALESCE(SUM(ii.quantity), 0) - m.min_stock) ASC
    LIMIT 10
  `);

  res.json({
    success: true,
    data: {
      summary: summaryResult.rows[0],
      low_stock_materials: lowStockResult.rows,
    },
  });
});

// ============ INVENTORY TRANSACTIONS ============

// Generate transaction number
const generateTransactionNumber = async (type: string): Promise<string> => {
  const date = new Date();
  const prefix = type;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  const countResult = await query(
    `SELECT COUNT(*) + 1 as next_num
     FROM inventory_transactions
     WHERE type = $1 AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
    [type]
  );

  const nextNum = String(countResult.rows[0].next_num).padStart(4, '0');
  return `${prefix}/${year}/${month}/${nextNum}`;
};

// POST /api/inventory/transactions/pz - Receipt (Przyjecie Zewnetrzne)
export const createReceiptPZ = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    material_id, location_id, quantity, unit_cost,
    batch_number, supplier, supplier_document, notes
  } = req.body;

  if (!material_id || !quantity || quantity <= 0) {
    throw new AppError('Material i ilosc sa wymagane', 400);
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Check if material exists
    const materialResult = await client.query('SELECT id, unit_cost FROM materials WHERE id = $1', [material_id]);
    if (materialResult.rows.length === 0) {
      throw new AppError('Material nie znaleziony', 404);
    }

    const effectiveUnitCost = unit_cost || materialResult.rows[0].unit_cost || 0;

    // Find or create inventory item
    let itemResult = await client.query(
      `SELECT id, quantity FROM inventory_items
       WHERE material_id = $1 AND COALESCE(location_id, 0) = COALESCE($2, 0)
         AND COALESCE(batch_number, '') = COALESCE($3, '')`,
      [material_id, location_id, batch_number]
    );

    let itemId: number;
    let quantityBefore = 0;

    if (itemResult.rows.length === 0) {
      // Create new inventory item
      const newItemResult = await client.query(
        `INSERT INTO inventory_items (material_id, location_id, batch_number, quantity, unit_cost)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [material_id, location_id, batch_number, quantity, effectiveUnitCost]
      );
      itemId = newItemResult.rows[0].id;
    } else {
      itemId = itemResult.rows[0].id;
      quantityBefore = parseFloat(itemResult.rows[0].quantity);

      // Update existing item
      await client.query(
        `UPDATE inventory_items
         SET quantity = quantity + $1, unit_cost = $2, updated_at = NOW()
         WHERE id = $3`,
        [quantity, effectiveUnitCost, itemId]
      );
    }

    const quantityAfter = quantityBefore + quantity;
    const transactionNumber = await generateTransactionNumber('PZ');

    // Create transaction record
    const transactionResult = await client.query(
      `INSERT INTO inventory_transactions (
        transaction_number, item_id, material_id, type, quantity,
        quantity_before, quantity_after, unit_cost, total_cost,
        to_location_id, supplier, supplier_document, notes, worker_id
      ) VALUES ($1, $2, $3, 'PZ', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        transactionNumber, itemId, material_id, quantity,
        quantityBefore, quantityAfter, effectiveUnitCost, quantity * effectiveUnitCost,
        location_id, supplier, supplier_document, notes, req.user?.id
      ]
    );

    // Update material last purchase price
    await client.query(
      `UPDATE materials SET last_purchase_price = $1, updated_at = NOW() WHERE id = $2`,
      [effectiveUnitCost, material_id]
    );

    await client.query('COMMIT');

    logger.info(`PZ transaction created: ${transactionNumber}`);

    res.status(201).json({
      success: true,
      data: {
        transaction: transactionResult.rows[0],
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

// POST /api/inventory/transactions/wz - Issue (Wydanie Zewnetrzne)
export const createIssueWZ = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    inventory_item_id, quantity, reference_type, reference_id, reference_number, notes
  } = req.body;

  if (!inventory_item_id || !quantity || quantity <= 0) {
    throw new AppError('Pozycja magazynowa i ilosc sa wymagane', 400);
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Get inventory item
    const itemResult = await client.query(
      `SELECT ii.*, m.code as material_code, m.name as material_name
       FROM inventory_items ii
       JOIN materials m ON ii.material_id = m.id
       WHERE ii.id = $1`,
      [inventory_item_id]
    );

    if (itemResult.rows.length === 0) {
      throw new AppError('Pozycja magazynowa nie znaleziona', 404);
    }

    const item = itemResult.rows[0];
    const availableQty = parseFloat(item.available_quantity);

    if (quantity > availableQty) {
      throw new AppError(
        `Niewystarczajaca ilosc. Dostepne: ${availableQty}, wymagane: ${quantity}`,
        400
      );
    }

    const quantityBefore = parseFloat(item.quantity);
    const quantityAfter = quantityBefore - quantity;
    const transactionNumber = await generateTransactionNumber('WZ');

    // Update inventory item
    await client.query(
      `UPDATE inventory_items SET quantity = $1, updated_at = NOW() WHERE id = $2`,
      [quantityAfter, inventory_item_id]
    );

    // Create transaction
    const transactionResult = await client.query(
      `INSERT INTO inventory_transactions (
        transaction_number, item_id, material_id, type, quantity,
        quantity_before, quantity_after, unit_cost, total_cost,
        from_location_id, reference_type, reference_id, reference_number,
        notes, worker_id
      ) VALUES ($1, $2, $3, 'WZ', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        transactionNumber, inventory_item_id, item.material_id, -quantity,
        quantityBefore, quantityAfter, item.unit_cost, quantity * (item.unit_cost || 0),
        item.location_id, reference_type, reference_id, reference_number,
        notes, req.user?.id
      ]
    );

    await client.query('COMMIT');

    logger.info(`WZ transaction created: ${transactionNumber}`);

    res.status(201).json({
      success: true,
      data: {
        transaction: transactionResult.rows[0],
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

// GET /api/inventory/transactions
export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const { material_id, type, from_date, to_date, limit = 50, offset = 0 } = req.query;

  let sql = `
    SELECT it.*,
           m.code as material_code, m.name as material_name, m.unit,
           w.name as worker_name,
           fl.name as from_location_name, tl.name as to_location_name
    FROM inventory_transactions it
    LEFT JOIN materials m ON it.material_id = m.id
    LEFT JOIN workers w ON it.worker_id = w.id
    LEFT JOIN storage_locations fl ON it.from_location_id = fl.id
    LEFT JOIN storage_locations tl ON it.to_location_id = tl.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (material_id) {
    sql += ` AND it.material_id = $${paramIndex}`;
    params.push(material_id);
    paramIndex++;
  }

  if (type) {
    sql += ` AND it.type = $${paramIndex}`;
    params.push(type);
    paramIndex++;
  }

  if (from_date) {
    sql += ` AND it.created_at >= $${paramIndex}`;
    params.push(from_date);
    paramIndex++;
  }

  if (to_date) {
    sql += ` AND it.created_at <= $${paramIndex}`;
    params.push(to_date);
    paramIndex++;
  }

  // Get total count
  const countSql = sql.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
  const countResult = await query(countSql, params);
  const total = parseInt(countResult.rows[0].total);

  // Add pagination
  sql += ` ORDER BY it.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await query(sql, params);

  res.json({
    success: true,
    data: {
      transactions: result.rows,
      total,
      limit: Number(limit),
      offset: Number(offset),
    },
  });
});

// ============ MATERIAL RESERVATIONS ============

// POST /api/inventory/reservations
export const createReservation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { order_id, inventory_item_id, quantity_reserved, order_bom_item_id, notes } = req.body;

  if (!order_id || !inventory_item_id || !quantity_reserved || quantity_reserved <= 0) {
    throw new AppError('Zlecenie, pozycja magazynowa i ilosc sa wymagane', 400);
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Check inventory item availability
    const itemResult = await client.query(
      'SELECT available_quantity FROM inventory_items WHERE id = $1',
      [inventory_item_id]
    );

    if (itemResult.rows.length === 0) {
      throw new AppError('Pozycja magazynowa nie znaleziona', 404);
    }

    const available = parseFloat(itemResult.rows[0].available_quantity);
    if (quantity_reserved > available) {
      throw new AppError(
        `Niewystarczajaca dostepna ilosc. Dostepne: ${available}, wymagane: ${quantity_reserved}`,
        400
      );
    }

    // Update reserved quantity
    await client.query(
      `UPDATE inventory_items SET reserved_quantity = reserved_quantity + $1, updated_at = NOW()
       WHERE id = $2`,
      [quantity_reserved, inventory_item_id]
    );

    // Create reservation
    const reservationResult = await client.query(
      `INSERT INTO material_reservations (
        order_id, order_bom_item_id, inventory_item_id,
        quantity_reserved, reserved_by, notes
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [order_id, order_bom_item_id, inventory_item_id, quantity_reserved, req.user?.id, notes]
    );

    // Create RESERVE transaction
    const transactionNumber = await generateTransactionNumber('RESERVE');
    const itemData = await client.query('SELECT quantity, material_id FROM inventory_items WHERE id = $1', [inventory_item_id]);

    await client.query(
      `INSERT INTO inventory_transactions (
        transaction_number, item_id, material_id, type, quantity,
        reference_type, reference_id, notes, worker_id
      ) VALUES ($1, $2, $3, 'RESERVE', $4, 'order', $5, $6, $7)`,
      [transactionNumber, inventory_item_id, itemData.rows[0].material_id, quantity_reserved, order_id, notes, req.user?.id]
    );

    await client.query('COMMIT');

    logger.info(`Reservation created for order ${order_id}`);

    res.status(201).json({
      success: true,
      data: { reservation: reservationResult.rows[0] },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// GET /api/inventory/reservations
export const getReservations = asyncHandler(async (req: Request, res: Response) => {
  const { order_id, status } = req.query;

  let sql = `
    SELECT mr.*,
           ii.batch_number, m.code as material_code, m.name as material_name, m.unit,
           o.order_number, w.name as reserved_by_name
    FROM material_reservations mr
    JOIN inventory_items ii ON mr.inventory_item_id = ii.id
    JOIN materials m ON ii.material_id = m.id
    JOIN orders o ON mr.order_id = o.id
    LEFT JOIN workers w ON mr.reserved_by = w.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (order_id) {
    sql += ` AND mr.order_id = $${paramIndex}`;
    params.push(order_id);
    paramIndex++;
  }

  if (status) {
    sql += ` AND mr.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  sql += ' ORDER BY mr.reserved_at DESC';

  const result = await query(sql, params);

  res.json({
    success: true,
    data: { reservations: result.rows },
  });
});

// POST /api/inventory/reservations/:id/issue - Issue reserved materials
export const issueReservation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { quantity_to_issue, notes } = req.body;

  const client = await getClient();

  try {
    await client.query('BEGIN');

    const reservationResult = await client.query(
      `SELECT mr.*, ii.quantity, ii.material_id, ii.location_id
       FROM material_reservations mr
       JOIN inventory_items ii ON mr.inventory_item_id = ii.id
       WHERE mr.id = $1`,
      [id]
    );

    if (reservationResult.rows.length === 0) {
      throw new AppError('Rezerwacja nie znaleziona', 404);
    }

    const reservation = reservationResult.rows[0];
    const remainingToIssue = reservation.quantity_reserved - reservation.quantity_issued;
    const issueQty = quantity_to_issue || remainingToIssue;

    if (issueQty > remainingToIssue) {
      throw new AppError(`Mozna wydac maksymalnie: ${remainingToIssue}`, 400);
    }

    // Update inventory item (reduce quantity and reserved)
    await client.query(
      `UPDATE inventory_items
       SET quantity = quantity - $1,
           reserved_quantity = reserved_quantity - $1,
           updated_at = NOW()
       WHERE id = $2`,
      [issueQty, reservation.inventory_item_id]
    );

    // Update reservation
    const newIssuedQty = reservation.quantity_issued + issueQty;
    const newStatus = newIssuedQty >= reservation.quantity_reserved ? 'issued' : 'partially_issued';

    await client.query(
      `UPDATE material_reservations
       SET quantity_issued = $1, status = $2, issued_by = $3, issued_at = NOW(), updated_at = NOW()
       WHERE id = $4`,
      [newIssuedQty, newStatus, req.user?.id, id]
    );

    // Create WZ transaction
    const transactionNumber = await generateTransactionNumber('WZ');

    await client.query(
      `INSERT INTO inventory_transactions (
        transaction_number, item_id, material_id, type, quantity,
        from_location_id, reference_type, reference_id, notes, worker_id
      ) VALUES ($1, $2, $3, 'WZ', $4, $5, 'order', $6, $7, $8)`,
      [
        transactionNumber, reservation.inventory_item_id, reservation.material_id,
        -issueQty, reservation.location_id, reservation.order_id, notes, req.user?.id
      ]
    );

    await client.query('COMMIT');

    logger.info(`Issued ${issueQty} from reservation ${id}`);

    res.json({
      success: true,
      message: `Wydano ${issueQty} jednostek`,
      data: { transaction_number: transactionNumber },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// DELETE /api/inventory/reservations/:id - Cancel reservation
export const cancelReservation = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const client = await getClient();

  try {
    await client.query('BEGIN');

    const reservationResult = await client.query(
      `SELECT mr.*, ii.material_id
       FROM material_reservations mr
       JOIN inventory_items ii ON mr.inventory_item_id = ii.id
       WHERE mr.id = $1`,
      [id]
    );

    if (reservationResult.rows.length === 0) {
      throw new AppError('Rezerwacja nie znaleziona', 404);
    }

    const reservation = reservationResult.rows[0];

    if (reservation.status === 'issued') {
      throw new AppError('Nie mozna anulowac wydanej rezerwacji', 400);
    }

    const remainingReserved = reservation.quantity_reserved - reservation.quantity_issued;

    // Release reserved quantity
    await client.query(
      `UPDATE inventory_items SET reserved_quantity = reserved_quantity - $1, updated_at = NOW()
       WHERE id = $2`,
      [remainingReserved, reservation.inventory_item_id]
    );

    // Update reservation status
    await client.query(
      `UPDATE material_reservations SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    // Create RELEASE transaction
    const transactionNumber = await generateTransactionNumber('RELEASE');

    await client.query(
      `INSERT INTO inventory_transactions (
        transaction_number, item_id, material_id, type, quantity,
        reference_type, reference_id, notes, worker_id
      ) VALUES ($1, $2, $3, 'RELEASE', $4, 'order', $5, 'Anulowanie rezerwacji', $6)`,
      [
        transactionNumber, reservation.inventory_item_id, reservation.material_id,
        remainingReserved, reservation.order_id, req.user?.id
      ]
    );

    await client.query('COMMIT');

    logger.info(`Reservation ${id} cancelled`);

    res.json({
      success: true,
      message: 'Rezerwacja anulowana',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});
