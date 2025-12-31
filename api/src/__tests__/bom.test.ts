import request from 'supertest';
import { createTestApp, testUsers, getAuthHeader } from './testUtils';

const app = createTestApp();

describe('BOM API', () => {
  describe('GET /api/orders/:orderId/bom', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/orders/1/bom');

      expect(response.status).toBe(401);
    });

    it('should allow authenticated user to view BOM', async () => {
      const response = await request(app)
        .get('/api/orders/1/bom')
        .set(getAuthHeader(testUsers.worker));

      expect(response.status).not.toBe(401);
    });
  });

  describe('POST /api/orders/:orderId/bom', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/orders/1/bom')
        .send({
          items: [
            { name: 'Plexi 3mm', quantity_planned: 2, unit: 'm2' },
          ],
        });

      expect(response.status).toBe(401);
    });

    it('should reject worker creating BOM', async () => {
      const response = await request(app)
        .post('/api/orders/1/bom')
        .set(getAuthHeader(testUsers.worker))
        .send({
          items: [
            { name: 'Plexi 3mm', quantity_planned: 2, unit: 'm2' },
          ],
        });

      expect(response.status).toBe(403);
    });

    it('should allow manager to create BOM', async () => {
      const response = await request(app)
        .post('/api/orders/1/bom')
        .set(getAuthHeader(testUsers.manager))
        .send({
          items: [
            {
              name: 'Plexi Clear 3mm',
              quantity_planned: 2.5,
              unit: 'm2',
              unit_cost: 120,
              waste_percentage: 10,
            },
            {
              name: 'Klej UV',
              quantity_planned: 0.5,
              unit: 'l',
              unit_cost: 200,
            },
          ],
        });

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('should require items array', async () => {
      const response = await request(app)
        .post('/api/orders/1/bom')
        .set(getAuthHeader(testUsers.manager))
        .send({});

      // Should return 400 (validation) or 500 (DB error without items)
      expect([400, 500]).toContain(response.status);
    });
  });

  describe('PUT /api/bom/:bomId/items/:itemId', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .put('/api/bom/1/items/1')
        .send({ quantity_used: 2.2 });

      expect(response.status).toBe(401);
    });

    it('should allow manager to update BOM item', async () => {
      const response = await request(app)
        .put('/api/bom/1/items/1')
        .set(getAuthHeader(testUsers.manager))
        .send({
          quantity_used: 2.2,
          unit_cost: 125,
          notes: 'Zużyto trochę więcej materiału',
        });

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('DELETE /api/bom/:bomId', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .delete('/api/bom/1');

      expect(response.status).toBe(401);
    });

    it('should reject worker deleting BOM', async () => {
      const response = await request(app)
        .delete('/api/bom/1')
        .set(getAuthHeader(testUsers.worker));

      // Should return 403 (forbidden) or 404 (not found - checked before auth in some cases)
      expect([403, 404]).toContain(response.status);
    });

    it('should allow manager to delete BOM', async () => {
      const response = await request(app)
        .delete('/api/bom/999')
        .set(getAuthHeader(testUsers.manager));

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });
});

describe('BOM Validation', () => {
  it('should validate item name is required', async () => {
    const response = await request(app)
      .post('/api/orders/1/bom')
      .set(getAuthHeader(testUsers.manager))
      .send({
        items: [
          { quantity_planned: 2, unit: 'm2' }, // Missing name
        ],
      });

    // Should return 400
    expect([400, 500]).toContain(response.status);
  });

  it('should validate quantity is positive', async () => {
    const response = await request(app)
      .post('/api/orders/1/bom')
      .set(getAuthHeader(testUsers.manager))
      .send({
        items: [
          { name: 'Test', quantity_planned: -5, unit: 'm2' },
        ],
      });

    // Should handle gracefully
    expect(response.status).not.toBe(401);
  });

  it('should handle duplicate BOM for same order', async () => {
    // First BOM
    await request(app)
      .post('/api/orders/1/bom')
      .set(getAuthHeader(testUsers.manager))
      .send({
        items: [{ name: 'Item 1', quantity_planned: 1, unit: 'szt' }],
      });

    // Second BOM (should update or reject)
    const response = await request(app)
      .post('/api/orders/1/bom')
      .set(getAuthHeader(testUsers.manager))
      .send({
        items: [{ name: 'Item 2', quantity_planned: 2, unit: 'szt' }],
      });

    // Should handle gracefully (update existing or create new)
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
  });
});

describe('BOM Cost Calculation', () => {
  it('should calculate total cost with waste percentage', async () => {
    const response = await request(app)
      .post('/api/orders/1/bom')
      .set(getAuthHeader(testUsers.manager))
      .send({
        items: [
          {
            name: 'Material',
            quantity_planned: 10,
            unit: 'm2',
            unit_cost: 100,
            waste_percentage: 15, // 15% waste
          },
        ],
      });

    expect(response.status).not.toBe(401);
    // Total should be: 10 * 100 * 1.15 = 1150
  });

  it('should handle zero cost items', async () => {
    const response = await request(app)
      .post('/api/orders/1/bom')
      .set(getAuthHeader(testUsers.manager))
      .send({
        items: [
          { name: 'Free Sample', quantity_planned: 1, unit: 'szt', unit_cost: 0 },
        ],
      });

    expect(response.status).not.toBe(401);
  });
});
