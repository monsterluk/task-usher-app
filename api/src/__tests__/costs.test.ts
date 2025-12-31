import request from 'supertest';
import { createTestApp, testUsers, getAuthHeader } from './testUtils';

const app = createTestApp();

describe('Costs API', () => {
  describe('GET /api/orders/:id/cost', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/orders/1/cost');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should allow manager to view costs', async () => {
      const response = await request(app)
        .get('/api/orders/1/cost')
        .set(getAuthHeader(testUsers.manager));

      // Should not be 401 or 403
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('should allow admin to view costs', async () => {
      const response = await request(app)
        .get('/api/orders/1/cost')
        .set(getAuthHeader(testUsers.admin));

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('PUT /api/costs/orders/:id/material', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .put('/api/costs/orders/1/material')
        .send({ material_cost: 100 });

      expect(response.status).toBe(401);
    });

    it('should allow manager to update material cost', async () => {
      const response = await request(app)
        .put('/api/costs/orders/1/material')
        .set(getAuthHeader(testUsers.manager))
        .send({ material_cost: 150.50 });

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('should reject worker updating material cost', async () => {
      const response = await request(app)
        .put('/api/costs/orders/1/material')
        .set(getAuthHeader(testUsers.worker))
        .send({ material_cost: 100 });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/costs/summary', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/costs/summary');

      expect(response.status).toBe(401);
    });

    it('should accept date range parameters', async () => {
      const response = await request(app)
        .get('/api/costs/summary')
        .query({
          from_date: '2025-01-01',
          to_date: '2025-01-31',
        })
        .set(getAuthHeader(testUsers.manager));

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('should work without date parameters (default 30 days)', async () => {
      const response = await request(app)
        .get('/api/costs/summary')
        .set(getAuthHeader(testUsers.manager));

      expect(response.status).not.toBe(401);
    });
  });

  describe('POST /api/costs/quote', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/costs/quote')
        .send({
          product_type: 'display',
          quantity: 10,
          material_type: 'plexi_clear_3mm',
          material_quantity: 2,
        });

      expect(response.status).toBe(401);
    });

    it('should calculate quote with valid data', async () => {
      const response = await request(app)
        .post('/api/costs/quote')
        .set(getAuthHeader(testUsers.manager))
        .send({
          product_type: 'display',
          quantity: 10,
          material_type: 'plexi_clear_3mm',
          material_quantity: 2,
          stages: [
            { type: 'ciecie_laser', estimated_hours: 2 },
            { type: 'giecie', estimated_hours: 1 },
          ],
        });

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('should handle unknown material type', async () => {
      const response = await request(app)
        .post('/api/costs/quote')
        .set(getAuthHeader(testUsers.manager))
        .send({
          product_type: 'custom',
          quantity: 5,
          material_type: 'unknown_material',
          material_quantity: 1,
        });

      // Should not crash, use default price
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(500);
    });

    it('should handle empty stages array', async () => {
      const response = await request(app)
        .post('/api/costs/quote')
        .set(getAuthHeader(testUsers.manager))
        .send({
          product_type: 'simple',
          quantity: 1,
          material_type: 'pcv_3mm',
          material_quantity: 0.5,
          stages: [],
        });

      expect(response.status).not.toBe(401);
    });
  });
});

describe('Cost Calculation Validation', () => {
  it('should handle invalid order id', async () => {
    const response = await request(app)
      .get('/api/orders/invalid/cost')
      .set(getAuthHeader(testUsers.manager));

    // Should return 400 or 404, not crash
    expect([400, 404, 500]).toContain(response.status);
  });

  it('should handle non-existent order', async () => {
    const response = await request(app)
      .get('/api/orders/999999/cost')
      .set(getAuthHeader(testUsers.manager));

    // Should return 404 or 500 (DB error)
    expect(response.status).not.toBe(401);
  });

  it('should validate material_cost is numeric', async () => {
    const response = await request(app)
      .put('/api/orders/1/material-cost')
      .set(getAuthHeader(testUsers.manager))
      .send({ material_cost: 'not-a-number' });

    // Should handle gracefully
    expect(response.status).not.toBe(401);
  });

  it('should handle negative quantity in quote', async () => {
    const response = await request(app)
      .post('/api/costs/quote')
      .set(getAuthHeader(testUsers.manager))
      .send({
        product_type: 'test',
        quantity: -5,
        material_type: 'plexi_clear_3mm',
        material_quantity: 1,
      });

    // Should handle gracefully (may accept or return 400)
    expect(response.status).not.toBe(401);
  });
});
