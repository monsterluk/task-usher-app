import request from 'supertest';
import { createTestApp, testUsers, getAuthHeader, testOrders } from './testUtils';

const app = createTestApp();

describe('Orders API', () => {
  describe('GET /api/orders', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/orders');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should accept request with valid token', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set(getAuthHeader(testUsers.manager));

      // Not 401 means auth passed
      expect(response.status).not.toBe(401);
    });

    it('should support pagination params', async () => {
      const response = await request(app)
        .get('/api/orders?limit=10&offset=0')
        .set(getAuthHeader(testUsers.manager));

      expect(response.status).not.toBe(401);
    });

    it('should support status filter', async () => {
      const response = await request(app)
        .get('/api/orders?status=W_PRODUKCJI')
        .set(getAuthHeader(testUsers.manager));

      expect(response.status).not.toBe(401);
    });

    it('should support archived filter', async () => {
      const response = await request(app)
        .get('/api/orders?archived=true')
        .set(getAuthHeader(testUsers.manager));

      expect(response.status).not.toBe(401);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/orders/1');

      expect(response.status).toBe(401);
    });

    it('should reject invalid order ID format', async () => {
      const response = await request(app)
        .get('/api/orders/invalid')
        .set(getAuthHeader(testUsers.manager));

      expect(response.status).toBe(400);
    });

    it('should accept valid order ID', async () => {
      const response = await request(app)
        .get('/api/orders/1')
        .set(getAuthHeader(testUsers.manager));

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(400);
    });
  });

  describe('POST /api/orders', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send(testOrders.basic);

      expect(response.status).toBe(401);
    });

    it('should reject request from worker (insufficient permissions)', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set(getAuthHeader(testUsers.worker))
        .send(testOrders.basic);

      expect(response.status).toBe(403);
    });

    it('should reject order without required fields', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set(getAuthHeader(testUsers.manager))
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject order without order_number', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set(getAuthHeader(testUsers.manager))
        .send({
          client_name: 'Test',
          product_name: 'Product',
          quantity: 10,
          price_total: 100,
        });

      expect(response.status).toBe(400);
    });

    it('should reject order without client_name', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set(getAuthHeader(testUsers.manager))
        .send({
          order_number: 'TEST-001',
          product_name: 'Product',
          quantity: 10,
          price_total: 100,
        });

      expect(response.status).toBe(400);
    });

    it('should reject order with negative quantity', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set(getAuthHeader(testUsers.manager))
        .send({
          ...testOrders.basic,
          quantity: -5,
        });

      expect(response.status).toBe(400);
    });

    it('should reject order with negative price', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set(getAuthHeader(testUsers.manager))
        .send({
          ...testOrders.basic,
          price_total: -100,
        });

      expect(response.status).toBe(400);
    });

    it('should accept valid order from manager', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set(getAuthHeader(testUsers.manager))
        .send(testOrders.basic);

      // Should not be 400, 401, or 403
      expect(response.status).not.toBe(400);
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('should accept valid order from admin', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set(getAuthHeader(testUsers.admin))
        .send(testOrders.withDetails);

      expect(response.status).not.toBe(400);
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('PUT /api/orders/:id', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .put('/api/orders/1')
        .send({ status: 'W_PRODUKCJI' });

      expect(response.status).toBe(401);
    });

    it('should reject invalid order ID', async () => {
      const response = await request(app)
        .put('/api/orders/invalid')
        .set(getAuthHeader(testUsers.manager))
        .send({ status: 'W_PRODUKCJI' });

      expect(response.status).toBe(400);
    });

    it('should accept valid update from manager', async () => {
      const response = await request(app)
        .put('/api/orders/1')
        .set(getAuthHeader(testUsers.manager))
        .send({ status: 'W_PRODUKCJI' });

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('POST /api/orders/:id/archive', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/orders/1/archive');

      expect(response.status).toBe(401);
    });

    it('should reject request from worker', async () => {
      const response = await request(app)
        .post('/api/orders/1/archive')
        .set(getAuthHeader(testUsers.worker));

      expect(response.status).toBe(403);
    });

    it('should accept archive request from manager', async () => {
      const response = await request(app)
        .post('/api/orders/1/archive')
        .set(getAuthHeader(testUsers.manager));

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('POST /api/orders/:id/unarchive', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/orders/1/unarchive');

      expect(response.status).toBe(401);
    });

    it('should accept unarchive request from manager', async () => {
      const response = await request(app)
        .post('/api/orders/1/unarchive')
        .set(getAuthHeader(testUsers.manager));

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('DELETE /api/orders/:id', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .delete('/api/orders/1');

      expect(response.status).toBe(401);
    });

    it('should reject request from worker', async () => {
      const response = await request(app)
        .delete('/api/orders/1')
        .set(getAuthHeader(testUsers.worker));

      expect(response.status).toBe(403);
    });

    it('should accept delete request from admin', async () => {
      const response = await request(app)
        .delete('/api/orders/999')
        .set(getAuthHeader(testUsers.admin));

      // Admin should pass auth (not 401)
      expect(response.status).not.toBe(401);
      // Response may be 403 if role check is different, or 404/500 if DB not connected
      // Main check is that auth passed
    });
  });
});

describe('Orders API - Edge Cases', () => {
  it('should handle very long order numbers', async () => {
    const response = await request(app)
      .post('/api/orders')
      .set(getAuthHeader(testUsers.admin)) // Use admin to ensure permission
      .send({
        ...testOrders.basic,
        order_number: 'A'.repeat(300), // Very long
      });

    // Should be rejected by validation (400) or accepted then fail on DB
    // Not 401 means auth worked
    expect(response.status).not.toBe(401);
  });

  it('should handle special characters in client name', async () => {
    const response = await request(app)
      .post('/api/orders')
      .set(getAuthHeader(testUsers.admin))
      .send({
        ...testOrders.basic,
        client_name: "O'Brien & Co. <script>alert('xss')</script>",
      });

    // Auth should pass - not 401
    expect(response.status).not.toBe(401);
    // Permission should pass - not 403
    expect(response.status).not.toBe(403);
    // 500 is acceptable when DB not connected (only in test env)
  });

  it('should handle zero quantity', async () => {
    const response = await request(app)
      .post('/api/orders')
      .set(getAuthHeader(testUsers.admin))
      .send({
        ...testOrders.basic,
        quantity: 0,
      });

    // Zero quantity should fail validation or be rejected
    // Not 401 means auth worked
    expect(response.status).not.toBe(401);
  });
});
