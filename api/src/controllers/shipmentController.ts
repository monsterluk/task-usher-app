import { Request, Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import * as apaczkaClient from '../utils/apaczka';

// POST /api/orders/:orderId/shipments
export const createShipment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { orderId } = req.params;
  const {
    weight,
    dimensions,
    package_type = 'PACZKA',
    service = 'DPD_CLASSIC',
    recipient_name,
    recipient_street,
    recipient_building_number,
    recipient_apartment_number,
    recipient_postal_code,
    recipient_city,
    recipient_phone,
    recipient_email,
  } = req.body;

  // Check if order exists
  const orderResult = await query('SELECT * FROM orders WHERE id = $1', [orderId]);

  if (orderResult.rows.length === 0) {
    throw new AppError('Order not found', 404);
  }

  const order = orderResult.rows[0];

  // Validate required fields
  if (!weight || !recipient_name || !recipient_street || !recipient_postal_code || !recipient_city || !recipient_phone) {
    throw new AppError(
      'Weight, recipient name, street, postal code, city, and phone are required',
      400
    );
  }

  // Parse dimensions if provided
  let packageData = {
    weight: parseFloat(weight),
    width: 30,
    height: 20,
    depth: 15,
  };

  if (dimensions) {
    // Format: "30x20x15" (WxHxD)
    const dimParts = dimensions.split('x').map((d: string) => parseInt(d.trim()));
    if (dimParts.length === 3) {
      packageData.width = dimParts[0];
      packageData.height = dimParts[1];
      packageData.depth = dimParts[2];
    }
  }

  // Prepare recipient data
  const recipientData = {
    name: recipient_name || order.client_name,
    street: recipient_street,
    building_number: recipient_building_number || '1',
    apartment_number: recipient_apartment_number,
    postal_code: recipient_postal_code,
    city: recipient_city,
    phone: recipient_phone || order.client_phone,
    email: recipient_email || order.client_email,
  };

  // Create shipment record in database first (pending status)
  const shipmentResult = await query(
    `INSERT INTO shipments (
      order_id, status, weight, dimensions, package_type, service,
      recipient_address, recipient_email, recipient_phone
    ) VALUES ($1, 'OCZEKUJE', $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      orderId,
      weight,
      dimensions,
      package_type,
      service,
      `${recipient_name}, ${recipient_street} ${recipient_building_number}${recipient_apartment_number ? '/' + recipient_apartment_number : ''}, ${recipient_postal_code} ${recipient_city}`,
      recipientData.email,
      recipientData.phone,
    ]
  );

  const shipment = shipmentResult.rows[0];

  // Try to create shipment with Apaczka API
  try {
    const apaczkaOrder = apaczkaClient.prepareShipmentFromOrder(
      order,
      recipientData,
      packageData,
      service
    );

    const apaczkaResponse = await apaczkaClient.createShipment(apaczkaOrder);

    if (apaczkaResponse.success) {
      // Update shipment with Apaczka response
      const updateResult = await query(
        `UPDATE shipments
         SET shipment_number = $1, tracking_url = $2, status = 'ZAMÓWIONA',
             apaczka_response = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [
          apaczkaResponse.waybill_number,
          apaczkaResponse.tracking_url,
          JSON.stringify(apaczkaResponse),
          shipment.id,
        ]
      );

      logger.info(
        `Shipment created via Apaczka: ${apaczkaResponse.waybill_number} for order ${order.order_number}`
      );

      return res.status(201).json({
        success: true,
        data: {
          shipment: updateResult.rows[0],
          apaczka_order_id: apaczkaResponse.order_id,
        },
      });
    } else {
      // Apaczka failed but we have local record
      logger.warn(`Apaczka API failed for order ${order.order_number}: ${apaczkaResponse.error}`);

      return res.status(201).json({
        success: true,
        data: {
          shipment,
          warning: `Shipment record created but Apaczka API failed: ${apaczkaResponse.error}`,
        },
      });
    }
  } catch (error: any) {
    logger.error(`Apaczka API error: ${error.message}`);

    // Return success with warning - local record was created
    return res.status(201).json({
      success: true,
      data: {
        shipment,
        warning: `Shipment record created but Apaczka API error: ${error.message}`,
      },
    });
  }
});

// GET /api/orders/:orderId/shipments
export const getOrderShipments = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;

  const result = await query(
    'SELECT * FROM shipments WHERE order_id = $1 ORDER BY created_at DESC',
    [orderId]
  );

  res.json({
    success: true,
    data: {
      shipments: result.rows,
    },
  });
});

// GET /api/shipments/:id
export const getShipmentById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await query(
    `SELECT s.*, o.order_number, o.client_name, o.product_name
     FROM shipments s
     JOIN orders o ON s.order_id = o.id
     WHERE s.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Shipment not found', 404);
  }

  res.json({
    success: true,
    data: {
      shipment: result.rows[0],
    },
  });
});

// PUT /api/shipments/:id
export const updateShipment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, shipment_number, tracking_url } = req.body;

  // Check if shipment exists
  const existingResult = await query('SELECT * FROM shipments WHERE id = $1', [id]);

  if (existingResult.rows.length === 0) {
    throw new AppError('Shipment not found', 404);
  }

  // Build update query
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (status !== undefined) {
    updates.push(`status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  if (shipment_number !== undefined) {
    updates.push(`shipment_number = $${paramIndex}`);
    params.push(shipment_number);
    paramIndex++;
  }

  if (tracking_url !== undefined) {
    updates.push(`tracking_url = $${paramIndex}`);
    params.push(tracking_url);
    paramIndex++;
  }

  if (updates.length === 0) {
    throw new AppError('No fields to update', 400);
  }

  updates.push(`updated_at = NOW()`);
  params.push(id);

  const result = await query(
    `UPDATE shipments SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  logger.info(`Shipment ${id} updated`);

  res.json({
    success: true,
    data: {
      shipment: result.rows[0],
    },
  });
});

// DELETE /api/shipments/:id
export const deleteShipment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const existingResult = await query('SELECT shipment_number FROM shipments WHERE id = $1', [id]);

  if (existingResult.rows.length === 0) {
    throw new AppError('Shipment not found', 404);
  }

  // Try to cancel with Apaczka if we have an order_id
  const shipment = existingResult.rows[0];
  if (shipment.apaczka_response?.order_id) {
    try {
      await apaczkaClient.cancelShipment(shipment.apaczka_response.order_id);
      logger.info(`Shipment cancelled with Apaczka: ${shipment.shipment_number}`);
    } catch (error: any) {
      logger.warn(`Could not cancel shipment with Apaczka: ${error.message}`);
    }
  }

  await query('DELETE FROM shipments WHERE id = $1', [id]);

  logger.info(`Shipment deleted: ${id}`);

  res.json({
    success: true,
    message: 'Shipment deleted successfully',
  });
});

// POST /api/shipments/:id/refresh-status
export const refreshShipmentStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const existingResult = await query('SELECT * FROM shipments WHERE id = $1', [id]);

  if (existingResult.rows.length === 0) {
    throw new AppError('Shipment not found', 404);
  }

  const shipment = existingResult.rows[0];

  if (!shipment.apaczka_response?.order_id) {
    throw new AppError('No Apaczka order ID available for this shipment', 400);
  }

  try {
    const statusResponse = await apaczkaClient.getShipmentStatus(
      shipment.apaczka_response.order_id
    );

    // Map Apaczka status to our status
    let newStatus = shipment.status;
    if (statusResponse.status === 'DELIVERED') {
      newStatus = 'DOSTARCZONA';
    } else if (statusResponse.status === 'IN_TRANSIT') {
      newStatus = 'W_DRODZE';
    }

    const result = await query(
      `UPDATE shipments
       SET status = $1, apaczka_response = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [newStatus, JSON.stringify(statusResponse), id]
    );

    res.json({
      success: true,
      data: {
        shipment: result.rows[0],
        apaczka_status: statusResponse,
      },
    });
  } catch (error: any) {
    throw new AppError(`Could not refresh status: ${error.message}`, 500);
  }
});

// GET /api/shipments/services
export const getAvailableServices = asyncHandler(async (req: Request, res: Response) => {
  try {
    const services = await apaczkaClient.getServices();

    res.json({
      success: true,
      data: {
        services,
      },
    });
  } catch (error: any) {
    throw new AppError(`Could not get services: ${error.message}`, 500);
  }
});
