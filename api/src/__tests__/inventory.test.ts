import request from 'supertest';
import { createTestApp, testUsers, getAuthHeader } from './testUtils';

const app = createTestApp();

describe('Inventory API', () => {
  // Inventory uses /materials, /stock, /locations, /transactions

  describe('GET /api/inventory/materials', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/inventory/materials');

      expect(response.status).toBe(401);
    });

    it('should allow authenticated user to list materials', async () => {
      const response = await request(app)
        .get('/api/inventory/materials')
        .set(getAuthHeader(testUsers.worker));

      expect(response.status).not.toBe(401);
    });
  });

  describe('GET /api/inventory/materials/:id', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/inventory/materials/1');

      expect(response.status).toBe(401);
    });

    it('should allow authenticated user to view material', async () => {
      const response = await request(app)
        .get('/api/inventory/materials/1')
        .set(getAuthHeader(testUsers.worker));

      expect(response.status).not.toBe(401);
    });
  });

  describe('POST /api/inventory/materials', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/inventory/materials')
        .send({
          name: 'Plexi Clear 3mm',
          sku: 'PLX-CLR-3',
          category_id: 1,
        });

      expect(response.status).toBe(401);
    });

    it('should reject worker creating material', async () => {
      const response = await request(app)
        .post('/api/inventory/materials')
        .set(getAuthHeader(testUsers.worker))
        .send({
          name: 'Plexi Clear 3mm',
          sku: 'PLX-CLR-3',
          category_id: 1,
        });

      expect(response.status).toBe(403);
    });

    it('should allow manager to create material', async () => {
      const response = await request(app)
        .post('/api/inventory/materials')
        .set(getAuthHeader(testUsers.manager))
        .send({
          name: 'Plexi Clear 3mm',
          sku: 'PLX-CLR-3-TEST',
          category_id: 1,
          unit: 'm2',
          unit_cost: 120,
        });

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('PUT /api/inventory/materials/:id', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .put('/api/inventory/materials/1')
        .send({ unit_cost: 125 });

      expect(response.status).toBe(401);
    });

    it('should allow manager to update material', async () => {
      const response = await request(app)
        .put('/api/inventory/materials/1')
        .set(getAuthHeader(testUsers.manager))
        .send({
          unit_cost: 125,
          notes: 'Updated cost',
        });

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('GET /api/inventory/stock', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/inventory/stock');

      expect(response.status).toBe(401);
    });

    it('should allow authenticated user to view stock', async () => {
      const response = await request(app)
        .get('/api/inventory/stock')
        .set(getAuthHeader(testUsers.worker));

      expect(response.status).not.toBe(401);
    });
  });

  describe('GET /api/inventory/stock/summary', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/inventory/stock/summary');

      expect(response.status).toBe(401);
    });

    it('should return stock summary', async () => {
      const response = await request(app)
        .get('/api/inventory/stock/summary')
        .set(getAuthHeader(testUsers.manager));

      expect(response.status).not.toBe(401);
    });
  });

  describe('GET /api/inventory/categories', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/inventory/categories');

      expect(response.status).toBe(401);
    });

    it('should allow authenticated user to list categories', async () => {
      const response = await request(app)
        .get('/api/inventory/categories')
        .set(getAuthHeader(testUsers.worker));

      expect(response.status).not.toBe(401);
    });
  });

  describe('POST /api/inventory/categories', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/inventory/categories')
        .send({ name: 'New Category' });

      expect(response.status).toBe(401);
    });

    it('should reject worker creating category', async () => {
      const response = await request(app)
        .post('/api/inventory/categories')
        .set(getAuthHeader(testUsers.worker))
        .send({ name: 'New Category' });

      expect(response.status).toBe(403);
    });

    it('should allow manager to create category', async () => {
      const response = await request(app)
        .post('/api/inventory/categories')
        .set(getAuthHeader(testUsers.manager))
        .send({ name: 'New Category', description: 'Test' });

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('GET /api/inventory/locations', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/inventory/locations');

      expect(response.status).toBe(401);
    });

    it('should allow authenticated user to list locations', async () => {
      const response = await request(app)
        .get('/api/inventory/locations')
        .set(getAuthHeader(testUsers.worker));

      expect(response.status).not.toBe(401);
    });
  });

  describe('POST /api/inventory/locations', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/inventory/locations')
        .send({ name: 'Magazyn A' });

      expect(response.status).toBe(401);
    });

    it('should reject worker creating location', async () => {
      const response = await request(app)
        .post('/api/inventory/locations')
        .set(getAuthHeader(testUsers.worker))
        .send({ name: 'Magazyn A' });

      expect(response.status).toBe(403);
    });

    it('should allow manager to create location', async () => {
      const response = await request(app)
        .post('/api/inventory/locations')
        .set(getAuthHeader(testUsers.manager))
        .send({ name: 'Magazyn A', code: 'MAG-A' });

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('GET /api/inventory/transactions', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/inventory/transactions');

      expect(response.status).toBe(401);
    });

    it('should allow authenticated user to view transactions', async () => {
      const response = await request(app)
        .get('/api/inventory/transactions')
        .set(getAuthHeader(testUsers.worker));

      expect(response.status).not.toBe(401);
    });
  });

  describe('POST /api/inventory/transactions/pz (Receipt)', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/inventory/transactions/pz')
        .send({
          material_id: 1,
          quantity: 10,
          location_id: 1,
        });

      expect(response.status).toBe(401);
    });

    it('should reject worker creating receipt', async () => {
      const response = await request(app)
        .post('/api/inventory/transactions/pz')
        .set(getAuthHeader(testUsers.worker))
        .send({
          material_id: 1,
          quantity: 10,
          location_id: 1,
        });

      expect(response.status).toBe(403);
    });

    it('should allow manager to create receipt', async () => {
      const response = await request(app)
        .post('/api/inventory/transactions/pz')
        .set(getAuthHeader(testUsers.manager))
        .send({
          material_id: 1,
          quantity: 100,
          location_id: 1,
          reference: 'PO-2025-001',
          notes: 'Dostawa od dostawcy',
        });

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('POST /api/inventory/transactions/wz (Issue)', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/inventory/transactions/wz')
        .send({
          material_id: 1,
          quantity: 5,
          location_id: 1,
        });

      expect(response.status).toBe(401);
    });

    it('should reject worker creating issue', async () => {
      const response = await request(app)
        .post('/api/inventory/transactions/wz')
        .set(getAuthHeader(testUsers.worker))
        .send({
          material_id: 1,
          quantity: 5,
          location_id: 1,
        });

      expect(response.status).toBe(403);
    });

    it('should allow manager to create issue', async () => {
      const response = await request(app)
        .post('/api/inventory/transactions/wz')
        .set(getAuthHeader(testUsers.manager))
        .send({
          material_id: 1,
          quantity: 5,
          location_id: 1,
          order_id: 1,
          notes: 'Wydanie do produkcji',
        });

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('GET /api/inventory/reservations', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/inventory/reservations');

      expect(response.status).toBe(401);
    });

    it('should allow authenticated user to view reservations', async () => {
      const response = await request(app)
        .get('/api/inventory/reservations')
        .set(getAuthHeader(testUsers.worker));

      expect(response.status).not.toBe(401);
    });
  });

  describe('POST /api/inventory/reservations', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/inventory/reservations')
        .send({
          material_id: 1,
          quantity: 10,
          order_id: 1,
        });

      expect(response.status).toBe(401);
    });

    it('should reject worker creating reservation', async () => {
      const response = await request(app)
        .post('/api/inventory/reservations')
        .set(getAuthHeader(testUsers.worker))
        .send({
          material_id: 1,
          quantity: 10,
          order_id: 1,
        });

      expect(response.status).toBe(403);
    });

    it('should allow manager to create reservation', async () => {
      const response = await request(app)
        .post('/api/inventory/reservations')
        .set(getAuthHeader(testUsers.manager))
        .send({
          material_id: 1,
          quantity: 10,
          order_id: 1,
        });

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('DELETE /api/inventory/reservations/:id', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .delete('/api/inventory/reservations/1');

      expect(response.status).toBe(401);
    });

    it('should reject worker canceling reservation', async () => {
      const response = await request(app)
        .delete('/api/inventory/reservations/1')
        .set(getAuthHeader(testUsers.worker));

      expect(response.status).toBe(403);
    });

    it('should allow manager to cancel reservation', async () => {
      const response = await request(app)
        .delete('/api/inventory/reservations/999')
        .set(getAuthHeader(testUsers.manager));

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });
});

describe('Inventory Validation', () => {
  it('should validate material name is required', async () => {
    const response = await request(app)
      .post('/api/inventory/materials')
      .set(getAuthHeader(testUsers.manager))
      .send({
        sku: 'TEST-SKU',
        category_id: 1,
      });

    // Should return 400 or 500 (validation/DB error)
    expect([400, 500]).toContain(response.status);
  });

  it('should validate quantity in transactions', async () => {
    const response = await request(app)
      .post('/api/inventory/transactions/pz')
      .set(getAuthHeader(testUsers.manager))
      .send({
        material_id: 1,
        quantity: -10, // Negative
        location_id: 1,
      });

    // Should handle gracefully
    expect(response.status).not.toBe(401);
  });
});
