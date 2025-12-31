import { Request, Response } from 'express';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

// Get order items - returns order's product_name as single item (simplified implementation)
export const getOrderItems = async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.orderId);

    // Check if order_items table exists and has data
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'order_items'
      )
    `);

    let items: any[] = [];

    if (tableCheck.rows[0].exists) {
      // If order_items table exists, get items from it
      const result = await pool.query(`
        SELECT
          id,
          order_id,
          item_number,
          product_name,
          description,
          quantity,
          unit,
          price_per_unit,
          status,
          notes,
          created_at
        FROM order_items
        WHERE order_id = $1
        ORDER BY item_number ASC
      `, [orderId]);
      items = result.rows;
    }

    // If no items in order_items table, create virtual item from order
    if (items.length === 0) {
      const orderResult = await pool.query(`
        SELECT
          id,
          product_name,
          quantity,
          price_per_unit,
          price_total,
          status
        FROM orders
        WHERE id = $1
      `, [orderId]);

      if (orderResult.rows.length > 0) {
        const order = orderResult.rows[0];
        items = [{
          id: 0,
          order_id: orderId,
          item_number: 1,
          product_name: order.product_name,
          description: null,
          quantity: order.quantity || 1,
          unit: 'szt.',
          price_per_unit: order.price_per_unit || 0,
          price_total: order.price_total || 0,
          status: order.status,
          notes: null,
          created_at: new Date()
        }];
      }
    }

    res.json({
      success: true,
      data: {
        items,
        total: items.length
      }
    });
  } catch (error) {
    logger.error('Error getting order items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get order items'
    });
  }
};

// Create order item
export const createOrderItem = async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const { product_name, description, quantity, unit, price_per_unit, notes } = req.body;

    // Ensure order_items table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        item_number INTEGER NOT NULL DEFAULT 1,
        product_name VARCHAR(255) NOT NULL,
        description TEXT,
        quantity INTEGER DEFAULT 1,
        unit VARCHAR(50) DEFAULT 'szt.',
        price_per_unit NUMERIC(10,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'NOWE',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get next item number
    const maxResult = await pool.query(`
      SELECT COALESCE(MAX(item_number), 0) + 1 as next_number
      FROM order_items WHERE order_id = $1
    `, [orderId]);
    const itemNumber = maxResult.rows[0].next_number;

    const result = await pool.query(`
      INSERT INTO order_items (order_id, item_number, product_name, description, quantity, unit, price_per_unit, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [orderId, itemNumber, product_name, description, quantity || 1, unit || 'szt.', price_per_unit || 0, notes]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error creating order item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order item'
    });
  }
};

// Update order item
export const updateOrderItem = async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.id);
    const { product_name, description, quantity, unit, price_per_unit, status, notes } = req.body;

    const result = await pool.query(`
      UPDATE order_items
      SET
        product_name = COALESCE($1, product_name),
        description = COALESCE($2, description),
        quantity = COALESCE($3, quantity),
        unit = COALESCE($4, unit),
        price_per_unit = COALESCE($5, price_per_unit),
        status = COALESCE($6, status),
        notes = COALESCE($7, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [product_name, description, quantity, unit, price_per_unit, status, notes, itemId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order item not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error updating order item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update order item'
    });
  }
};

// Delete order item
export const deleteOrderItem = async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.id);

    const result = await pool.query(`
      DELETE FROM order_items WHERE id = $1 RETURNING *
    `, [itemId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order item not found'
      });
    }

    res.json({
      success: true,
      message: 'Order item deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting order item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete order item'
    });
  }
};
