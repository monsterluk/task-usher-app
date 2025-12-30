import { Response } from 'express';
import { query, getClient } from '../config/database';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import axios from 'axios';

// ============ INTEGRATION MANAGEMENT ============

// GET /api/integrations - List all integrations
export const getIntegrations = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await query(
    `SELECT
      id, name, display_name, description, provider, is_enabled,
      config, last_sync_at, last_sync_status, last_sync_message,
      sync_interval_minutes, created_at, updated_at
     FROM integrations
     ORDER BY display_name`
  );

  // Hide credentials from response
  res.json({
    success: true,
    data: {
      integrations: result.rows,
    },
  });
});

// GET /api/integrations/:name - Get integration details
export const getIntegration = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name } = req.params;

  const result = await query(
    `SELECT
      id, name, display_name, description, provider, is_enabled,
      config, last_sync_at, last_sync_status, last_sync_message,
      sync_interval_minutes, created_at, updated_at
     FROM integrations WHERE name = $1`,
    [name]
  );

  if (result.rows.length === 0) {
    throw new AppError('Integration not found', 404);
  }

  // Get recent logs
  const logsResult = await query(
    `SELECT * FROM integration_logs
     WHERE integration_id = $1
     ORDER BY created_at DESC LIMIT 20`,
    [result.rows[0].id]
  );

  res.json({
    success: true,
    data: {
      integration: result.rows[0],
      recent_logs: logsResult.rows,
    },
  });
});

// PUT /api/integrations/:name - Update integration config
export const updateIntegration = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name } = req.params;
  const { config, credentials, is_enabled, sync_interval_minutes } = req.body;
  const userId = req.user?.id;

  // Get worker ID
  const workerResult = await query('SELECT id FROM workers WHERE user_id = $1', [userId]);
  const workerId = workerResult.rows.length > 0 ? workerResult.rows[0].id : null;

  // Build update query
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (config !== undefined) {
    updates.push(`config = config || $${paramIndex}`);
    values.push(JSON.stringify(config));
    paramIndex++;
  }

  if (credentials !== undefined) {
    updates.push(`credentials = $${paramIndex}`);
    values.push(JSON.stringify(credentials));
    paramIndex++;
  }

  if (is_enabled !== undefined) {
    updates.push(`is_enabled = $${paramIndex}`);
    values.push(is_enabled);
    paramIndex++;
  }

  if (sync_interval_minutes !== undefined) {
    updates.push(`sync_interval_minutes = $${paramIndex}`);
    values.push(sync_interval_minutes);
    paramIndex++;
  }

  updates.push(`updated_by = $${paramIndex}`);
  values.push(workerId);
  paramIndex++;

  updates.push(`updated_at = NOW()`);

  values.push(name);

  const result = await query(
    `UPDATE integrations SET ${updates.join(', ')} WHERE name = $${paramIndex} RETURNING
      id, name, display_name, description, provider, is_enabled,
      config, last_sync_at, last_sync_status, sync_interval_minutes`,
    values
  );

  if (result.rows.length === 0) {
    throw new AppError('Integration not found', 404);
  }

  logger.info(`Integration ${name} updated by user ${userId}`);

  res.json({
    success: true,
    data: {
      integration: result.rows[0],
    },
  });
});

// POST /api/integrations/:name/test - Test integration connection
export const testIntegration = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name } = req.params;

  const result = await query(
    'SELECT * FROM integrations WHERE name = $1',
    [name]
  );

  if (result.rows.length === 0) {
    throw new AppError('Integration not found', 404);
  }

  const integration = result.rows[0];

  try {
    let testResult: { success: boolean; message: string; data?: any } = {
      success: false,
      message: 'Unknown provider',
    };

    switch (integration.provider) {
      case 'wfirma':
        testResult = await testWfirmaConnection(integration);
        break;
      case 'baselinker':
        testResult = await testBaselinkerConnection(integration);
        break;
      case 'allegro':
        testResult = await testAllegroConnection(integration);
        break;
      case 'apaczka':
        testResult = await testApaczkaConnection(integration);
        break;
      default:
        testResult = { success: false, message: `Unknown provider: ${integration.provider}` };
    }

    // Log test result
    await query(
      `INSERT INTO integration_logs (integration_id, action, status, response_data)
       VALUES ($1, 'test_connection', $2, $3)`,
      [integration.id, testResult.success ? 'success' : 'failed', JSON.stringify(testResult)]
    );

    res.json({
      success: testResult.success,
      data: testResult,
    });
  } catch (error) {
    logger.error(`Integration test failed for ${name}:`, error);

    await query(
      `INSERT INTO integration_logs (integration_id, action, status, error_message)
       VALUES ($1, 'test_connection', 'failed', $2)`,
      [integration.id, (error as Error).message]
    );

    throw new AppError(`Test failed: ${(error as Error).message}`, 500);
  }
});

// ============ WFIRMA.PL INTEGRATION ============

interface WfirmaCredentials {
  api_key?: string;
  login?: string;
  password?: string;
}

interface WfirmaConfig {
  api_url: string;
  company_id: string;
  auto_create_invoice: boolean;
  default_series: string;
  payment_method: string;
  payment_days: number;
}

// Test wFirma connection
const testWfirmaConnection = async (integration: any): Promise<{ success: boolean; message: string; data?: any }> => {
  const credentials: WfirmaCredentials = integration.credentials || {};
  const config: WfirmaConfig = integration.config || {};

  if (!credentials.api_key && (!credentials.login || !credentials.password)) {
    return { success: false, message: 'Brak danych uwierzytelniających. Wprowadź API Key lub login/hasło.' };
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (credentials.api_key) {
      headers['X-API-KEY'] = credentials.api_key;
    } else {
      const auth = Buffer.from(`${credentials.login}:${credentials.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    // Test by getting company info
    const response = await axios.post(
      `${config.api_url || 'https://api2.wfirma.pl'}/companies/get`,
      { company: { id: config.company_id || '' } },
      { headers, timeout: 10000 }
    );

    if (response.data && response.data.status === 'OK') {
      return {
        success: true,
        message: 'Połączenie z wFirma.pl udane',
        data: {
          company_name: response.data.company?.name,
          nip: response.data.company?.nip,
        },
      };
    }

    return {
      success: false,
      message: response.data?.message || 'Nieznany błąd wFirma API',
    };
  } catch (error: any) {
    if (error.response?.data) {
      return {
        success: false,
        message: `Błąd API: ${error.response.data.message || JSON.stringify(error.response.data)}`,
      };
    }
    throw error;
  }
};

// Test BaseLinker connection
const testBaselinkerConnection = async (integration: any): Promise<{ success: boolean; message: string; data?: any }> => {
  const credentials = integration.credentials || {};
  const config = integration.config || {};

  if (!credentials.api_token) {
    return { success: false, message: 'Brak tokenu API BaseLinker.' };
  }

  try {
    const response = await axios.post(
      config.api_url || 'https://api.baselinker.com/connector.php',
      new URLSearchParams({
        token: credentials.api_token,
        method: 'getStoragesList',
      }),
      { timeout: 10000 }
    );

    if (response.data && response.data.status === 'SUCCESS') {
      return {
        success: true,
        message: 'Połączenie z BaseLinker udane',
        data: {
          storages_count: response.data.storages?.length || 0,
        },
      };
    }

    return {
      success: false,
      message: response.data?.error_message || 'Nieznany błąd BaseLinker API',
    };
  } catch (error: any) {
    throw error;
  }
};

// Test Allegro connection (placeholder)
const testAllegroConnection = async (integration: any): Promise<{ success: boolean; message: string; data?: any }> => {
  const credentials = integration.credentials || {};

  if (!credentials.client_id || !credentials.client_secret) {
    return { success: false, message: 'Brak Client ID lub Client Secret dla Allegro.' };
  }

  // Allegro uses OAuth2 - would need token exchange
  return {
    success: false,
    message: 'Integracja Allegro wymaga autoryzacji OAuth2. Funkcja w przygotowaniu.',
  };
};

// Test Apaczka connection
const testApaczkaConnection = async (integration: any): Promise<{ success: boolean; message: string; data?: any }> => {
  const credentials = integration.credentials || {};
  const config = integration.config || {};

  if (!credentials.app_id || !credentials.app_secret) {
    return { success: false, message: 'Brak App ID lub App Secret dla Apaczka.pl.' };
  }

  try {
    // Apaczka uses HMAC authentication
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const crypto = require('crypto');
    const signature = crypto.createHmac('sha256', credentials.app_secret)
      .update(credentials.app_id + ':' + timestamp)
      .digest('hex');

    const response = await axios.get(
      `${config.api_url || 'https://www.apaczka.pl/api/v2'}/service_structure/`,
      {
        headers: {
          'Authorization': `${credentials.app_id}:${timestamp}:${signature}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (response.data && response.data.response) {
      return {
        success: true,
        message: 'Połączenie z Apaczka.pl udane',
        data: {
          services_count: Object.keys(response.data.response).length,
        },
      };
    }

    return {
      success: false,
      message: response.data?.message || 'Nieznany błąd Apaczka API',
    };
  } catch (error: any) {
    if (error.response?.data) {
      return {
        success: false,
        message: `Błąd API: ${error.response.data.message || JSON.stringify(error.response.data)}`,
      };
    }
    throw error;
  }
};

// POST /api/integrations/wfirma/create-invoice - Create invoice in wFirma
export const createWfirmaInvoice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { order_id, invoice_type = 'invoice' } = req.body;

  if (!order_id) {
    throw new AppError('Order ID is required', 400);
  }

  // Get integration config
  const integrationResult = await query(
    'SELECT * FROM integrations WHERE name = $1',
    ['wfirma']
  );

  if (integrationResult.rows.length === 0) {
    throw new AppError('wFirma integration not found', 404);
  }

  const integration = integrationResult.rows[0];

  if (!integration.is_enabled) {
    throw new AppError('Integracja wFirma nie jest włączona', 400);
  }

  const credentials: WfirmaCredentials = integration.credentials || {};
  const config: WfirmaConfig = integration.config || {};

  if (!credentials.api_key && (!credentials.login || !credentials.password)) {
    throw new AppError('Brak danych uwierzytelniających dla wFirma', 400);
  }

  // Get order details
  const orderResult = await query(
    `SELECT o.*,
      COALESCE(json_agg(
        json_build_object(
          'stage_name', s.stage_name,
          'total_cost', (SELECT COALESCE(SUM(ws.cost), 0) FROM work_sessions ws
                         JOIN assignments a ON ws.assignment_id = a.id
                         WHERE a.stage_id = s.id)
        )
      ) FILTER (WHERE s.id IS NOT NULL), '[]') as stages
     FROM orders o
     LEFT JOIN stages s ON s.order_id = o.id
     WHERE o.id = $1
     GROUP BY o.id`,
    [order_id]
  );

  if (orderResult.rows.length === 0) {
    throw new AppError('Order not found', 404);
  }

  const order = orderResult.rows[0];

  // Check if invoice already exists
  const existingInvoice = await query(
    `SELECT * FROM invoice_sync
     WHERE order_id = $1 AND integration_id = $2 AND invoice_type = $3 AND sync_status = 'synced'`,
    [order_id, integration.id, invoice_type]
  );

  if (existingInvoice.rows.length > 0) {
    throw new AppError(`Faktura typu ${invoice_type} już istnieje dla tego zamówienia: ${existingInvoice.rows[0].external_number}`, 400);
  }

  const startTime = Date.now();

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (credentials.api_key) {
      headers['X-API-KEY'] = credentials.api_key;
    } else {
      const auth = Buffer.from(`${credentials.login}:${credentials.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    // Prepare invoice data
    const invoiceData = {
      invoice: {
        company_id: config.company_id,
        series: config.default_series || null,
        type: invoice_type === 'proforma' ? 'proforma' : 'normal',
        payment_method: config.payment_method || 'transfer',
        payment_term: config.payment_days || 14,
        description: `Zlecenie: ${order.order_number} - ${order.product_name}`,
        contractor: {
          name: order.client_name,
          nip: order.client_nip || '',
          address: order.client_address || '',
          city: order.client_city || '',
          zip: order.client_zip || '',
          country: 'PL',
        },
        contents: [
          {
            name: order.product_name || 'Usługa produkcyjna',
            unit: 'szt.',
            count: order.quantity || 1,
            price: order.total_price || order.estimated_cost || 0,
            vat: '23',
          },
        ],
      },
    };

    // Create invoice in wFirma
    const response = await axios.post(
      `${config.api_url || 'https://api2.wfirma.pl'}/invoices/add`,
      invoiceData,
      { headers, timeout: 30000 }
    );

    const duration = Date.now() - startTime;

    if (response.data && response.data.status === 'OK') {
      const externalId = response.data.invoice?.id;
      const externalNumber = response.data.invoice?.fullnumber;

      // Save sync record
      await query(
        `INSERT INTO invoice_sync (order_id, integration_id, external_id, external_number, sync_status, invoice_type, invoice_data, synced_at)
         VALUES ($1, $2, $3, $4, 'synced', $5, $6, NOW())
         ON CONFLICT (order_id, integration_id, invoice_type)
         DO UPDATE SET external_id = $3, external_number = $4, sync_status = 'synced', invoice_data = $6, synced_at = NOW()`,
        [order_id, integration.id, externalId, externalNumber, invoice_type, JSON.stringify(response.data.invoice)]
      );

      // Log success
      await query(
        `INSERT INTO integration_logs (integration_id, action, status, request_data, response_data, records_processed, duration_ms)
         VALUES ($1, 'create_invoice', 'success', $2, $3, 1, $4)`,
        [integration.id, JSON.stringify({ order_id, invoice_type }), JSON.stringify(response.data), duration]
      );

      // Update integration last sync
      await query(
        `UPDATE integrations SET last_sync_at = NOW(), last_sync_status = 'success', last_sync_message = 'Faktura utworzona' WHERE id = $1`,
        [integration.id]
      );

      logger.info(`wFirma invoice created: ${externalNumber} for order ${order.order_number}`);

      res.json({
        success: true,
        data: {
          invoice_id: externalId,
          invoice_number: externalNumber,
          order_number: order.order_number,
          invoice_type,
        },
      });
    } else {
      throw new Error(response.data?.message || 'Unknown wFirma API error');
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorMessage = error.response?.data?.message || error.message;

    // Save failed sync record
    await query(
      `INSERT INTO invoice_sync (order_id, integration_id, sync_status, invoice_type, error_message)
       VALUES ($1, $2, 'failed', $3, $4)
       ON CONFLICT (order_id, integration_id, invoice_type)
       DO UPDATE SET sync_status = 'failed', error_message = $4, updated_at = NOW()`,
      [order_id, integration.id, invoice_type, errorMessage]
    );

    // Log failure
    await query(
      `INSERT INTO integration_logs (integration_id, action, status, request_data, error_message, duration_ms)
       VALUES ($1, 'create_invoice', 'failed', $2, $3, $4)`,
      [integration.id, JSON.stringify({ order_id, invoice_type }), errorMessage, duration]
    );

    // Update integration last sync
    await query(
      `UPDATE integrations SET last_sync_at = NOW(), last_sync_status = 'failed', last_sync_message = $1 WHERE id = $2`,
      [errorMessage, integration.id]
    );

    logger.error(`wFirma invoice creation failed for order ${order_id}:`, errorMessage);

    throw new AppError(`Błąd tworzenia faktury: ${errorMessage}`, 500);
  }
});

// GET /api/integrations/wfirma/invoices - Get synced invoices
export const getWfirmaInvoices = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { order_id, status, limit = 50 } = req.query;

  let sql = `
    SELECT
      is.*,
      o.order_number,
      o.client_name,
      o.product_name
    FROM invoice_sync is
    JOIN orders o ON is.order_id = o.id
    JOIN integrations i ON is.integration_id = i.id
    WHERE i.name = 'wfirma'
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (order_id) {
    sql += ` AND is.order_id = $${paramIndex}`;
    params.push(order_id);
    paramIndex++;
  }

  if (status) {
    sql += ` AND is.sync_status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  sql += ` ORDER BY is.created_at DESC LIMIT $${paramIndex}`;
  params.push(limit);

  const result = await query(sql, params);

  res.json({
    success: true,
    data: {
      invoices: result.rows,
      total: result.rows.length,
    },
  });
});

// GET /api/orders/:orderId/invoices - Get invoices for specific order
export const getOrderInvoices = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { orderId } = req.params;

  const result = await query(
    `SELECT
      is.*,
      i.name as integration_name,
      i.display_name as integration_display_name
     FROM invoice_sync is
     JOIN integrations i ON is.integration_id = i.id
     WHERE is.order_id = $1
     ORDER BY is.created_at DESC`,
    [orderId]
  );

  res.json({
    success: true,
    data: {
      invoices: result.rows,
    },
  });
});

// GET /api/integrations/:name/logs - Get integration logs
export const getIntegrationLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name } = req.params;
  const { action, status, limit = 100 } = req.query;

  const integrationResult = await query(
    'SELECT id FROM integrations WHERE name = $1',
    [name]
  );

  if (integrationResult.rows.length === 0) {
    throw new AppError('Integration not found', 404);
  }

  const integrationId = integrationResult.rows[0].id;

  let sql = 'SELECT * FROM integration_logs WHERE integration_id = $1';
  const params: any[] = [integrationId];
  let paramIndex = 2;

  if (action) {
    sql += ` AND action = $${paramIndex}`;
    params.push(action);
    paramIndex++;
  }

  if (status) {
    sql += ` AND status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  sql += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
  params.push(limit);

  const result = await query(sql, params);

  res.json({
    success: true,
    data: {
      logs: result.rows,
      total: result.rows.length,
    },
  });
});

// ============ APACZKA.PL INTEGRATION ============

// Helper: Create Apaczka auth header
const createApaczkaAuth = (appId: string, appSecret: string): string => {
  const crypto = require('crypto');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto.createHmac('sha256', appSecret)
    .update(appId + ':' + timestamp)
    .digest('hex');
  return `${appId}:${timestamp}:${signature}`;
};

// POST /api/integrations/apaczka/create-shipment - Create shipment in Apaczka
export const createApaczkaShipment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { shipment_id } = req.body;

  if (!shipment_id) {
    throw new AppError('Shipment ID is required', 400);
  }

  // Get integration config
  const integrationResult = await query(
    'SELECT * FROM integrations WHERE name = $1',
    ['apaczka']
  );

  if (integrationResult.rows.length === 0) {
    throw new AppError('Apaczka integration not found', 404);
  }

  const integration = integrationResult.rows[0];

  if (!integration.is_enabled) {
    throw new AppError('Integracja Apaczka nie jest włączona', 400);
  }

  const credentials = integration.credentials || {};
  const config = integration.config || {};

  if (!credentials.app_id || !credentials.app_secret) {
    throw new AppError('Brak danych uwierzytelniających dla Apaczka', 400);
  }

  // Get shipment details with order info
  const shipmentResult = await query(
    `SELECT s.*, o.client_name, o.client_address, o.client_city, o.client_zip, o.client_phone, o.client_email,
            o.order_number, o.product_name
     FROM shipments s
     JOIN orders o ON s.order_id = o.id
     WHERE s.id = $1`,
    [shipment_id]
  );

  if (shipmentResult.rows.length === 0) {
    throw new AppError('Shipment not found', 404);
  }

  const shipment = shipmentResult.rows[0];

  const startTime = Date.now();

  try {
    const authHeader = createApaczkaAuth(credentials.app_id, credentials.app_secret);
    const senderAddress = config.sender_address || {};

    // Prepare shipment data for Apaczka
    const shipmentData = {
      order: {
        service_id: config.default_service || 'UPS_STANDARD',
        address: {
          sender: {
            name: senderAddress.name || 'PlexiSystem',
            line1: senderAddress.line1 || '',
            line2: senderAddress.line2 || '',
            postal_code: senderAddress.postal_code || '',
            city: senderAddress.city || '',
            country_code: 'PL',
            contact_person: senderAddress.contact_person || '',
            phone: senderAddress.phone || '',
            email: senderAddress.email || '',
          },
          receiver: {
            name: shipment.client_name || shipment.recipient_name,
            line1: shipment.client_address || shipment.recipient_address,
            postal_code: shipment.client_zip || '',
            city: shipment.client_city || '',
            country_code: 'PL',
            contact_person: shipment.client_name || '',
            phone: shipment.client_phone || shipment.recipient_phone || '',
            email: shipment.client_email || '',
          },
        },
        pickup: {
          type: 'SELF',
        },
        shipment: {
          content: shipment.product_name || 'Produkty z plexi',
          is_cod: false,
          parcels: [{
            dimensions: {
              weight: shipment.weight || 1,
              width: 30,
              height: 30,
              length: 30,
            },
          }],
        },
        comment: `Zlecenie: ${shipment.order_number}`,
      },
    };

    const response = await axios.post(
      `${config.api_url || 'https://www.apaczka.pl/api/v2'}/order/`,
      shipmentData,
      {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const duration = Date.now() - startTime;

    if (response.data && response.data.response && response.data.response.id) {
      const externalId = response.data.response.id;
      const trackingNumber = response.data.response.waybill_number || '';

      // Update shipment with tracking info
      await query(
        `UPDATE shipments SET tracking_number = $1, carrier = 'Apaczka', status = 'NADANA', updated_at = NOW()
         WHERE id = $2`,
        [trackingNumber, shipment_id]
      );

      // Log success
      await query(
        `INSERT INTO integration_logs (integration_id, action, status, request_data, response_data, records_processed, duration_ms)
         VALUES ($1, 'create_shipment', 'success', $2, $3, 1, $4)`,
        [integration.id, JSON.stringify({ shipment_id }), JSON.stringify(response.data), duration]
      );

      // Update integration last sync
      await query(
        `UPDATE integrations SET last_sync_at = NOW(), last_sync_status = 'success', last_sync_message = 'Przesyłka utworzona' WHERE id = $1`,
        [integration.id]
      );

      logger.info(`Apaczka shipment created: ${externalId} for shipment ${shipment_id}`);

      res.json({
        success: true,
        data: {
          external_id: externalId,
          tracking_number: trackingNumber,
          shipment_id,
          order_number: shipment.order_number,
        },
      });
    } else {
      throw new Error(response.data?.message || 'Unknown Apaczka API error');
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorMessage = error.response?.data?.message || error.message;

    // Log failure
    await query(
      `INSERT INTO integration_logs (integration_id, action, status, request_data, error_message, duration_ms)
       VALUES ($1, 'create_shipment', 'failed', $2, $3, $4)`,
      [integration.id, JSON.stringify({ shipment_id }), errorMessage, duration]
    );

    // Update integration last sync
    await query(
      `UPDATE integrations SET last_sync_at = NOW(), last_sync_status = 'failed', last_sync_message = $1 WHERE id = $2`,
      [errorMessage, integration.id]
    );

    logger.error(`Apaczka shipment creation failed for shipment ${shipment_id}:`, errorMessage);

    throw new AppError(`Błąd tworzenia przesyłki: ${errorMessage}`, 500);
  }
});

// GET /api/integrations/apaczka/services - Get available Apaczka services
export const getApaczkaServices = asyncHandler(async (req: AuthRequest, res: Response) => {
  const integrationResult = await query(
    'SELECT * FROM integrations WHERE name = $1',
    ['apaczka']
  );

  if (integrationResult.rows.length === 0) {
    throw new AppError('Apaczka integration not found', 404);
  }

  const integration = integrationResult.rows[0];
  const credentials = integration.credentials || {};
  const config = integration.config || {};

  if (!credentials.app_id || !credentials.app_secret) {
    throw new AppError('Brak danych uwierzytelniających dla Apaczka', 400);
  }

  try {
    const authHeader = createApaczkaAuth(credentials.app_id, credentials.app_secret);

    const response = await axios.get(
      `${config.api_url || 'https://www.apaczka.pl/api/v2'}/service_structure/`,
      {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    res.json({
      success: true,
      data: {
        services: response.data.response || {},
      },
    });
  } catch (error: any) {
    logger.error('Failed to get Apaczka services:', error);
    throw new AppError(`Błąd pobierania usług: ${error.message}`, 500);
  }
});
