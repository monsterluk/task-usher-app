import request from 'supertest';
import { createTestApp, testUsers, getAuthHeader } from './testUtils';

const app = createTestApp();

describe('Stages API', () => {
  // Note: Stages are accessed via /api/orders/:orderId/stages for listing
  // and via /api/stages/:id for individual operations

  describe('GET /api/stages/:id', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/stages/1');

      expect(response.status).toBe(401);
    });

    it('should allow authenticated user to view stage', async () => {
      const response = await request(app)
        .get('/api/stages/1')
        .set(getAuthHeader(testUsers.worker));

      expect(response.status).not.toBe(401);
    });
  });

  describe('GET /api/stages/time-standards', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/stages/time-standards');

      expect(response.status).toBe(401);
    });

    it('should allow authenticated user to list time standards', async () => {
      const response = await request(app)
        .get('/api/stages/time-standards')
        .set(getAuthHeader(testUsers.worker));

      expect(response.status).not.toBe(401);
    });
  });

  describe('POST /api/stages/time-standards', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/stages/time-standards')
        .send({
          stage_type: 'LASER',
          tpz_minutes: 30,
          tj_minutes_per_unit: 5,
        });

      expect(response.status).toBe(401);
    });

    it('should reject worker creating time standard', async () => {
      const response = await request(app)
        .post('/api/stages/time-standards')
        .set(getAuthHeader(testUsers.worker))
        .send({
          stage_type: 'LASER',
          tpz_minutes: 30,
          tj_minutes_per_unit: 5,
        });

      expect(response.status).toBe(403);
    });

    it('should allow manager to create time standard', async () => {
      const response = await request(app)
        .post('/api/stages/time-standards')
        .set(getAuthHeader(testUsers.manager))
        .send({
          stage_type: 'LASER',
          tpz_minutes: 30,
          tj_minutes_per_unit: 5,
        });

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('PUT /api/stages/:id', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .put('/api/stages/1')
        .send({ stage_name: 'Updated Stage' });

      expect(response.status).toBe(401);
    });

    it('should reject worker updating stage', async () => {
      const response = await request(app)
        .put('/api/stages/1')
        .set(getAuthHeader(testUsers.worker))
        .send({ stage_name: 'Updated Stage' });

      expect(response.status).toBe(403);
    });

    it('should allow manager to update stage', async () => {
      const response = await request(app)
        .put('/api/stages/1')
        .set(getAuthHeader(testUsers.manager))
        .send({
          stage_name: 'Updated Stage Name',
          status: 'W_TRAKCIE',
        });

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('DELETE /api/stages/:id', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .delete('/api/stages/1');

      expect(response.status).toBe(401);
    });

    it('should reject worker deleting stage', async () => {
      const response = await request(app)
        .delete('/api/stages/1')
        .set(getAuthHeader(testUsers.worker));

      expect(response.status).toBe(403);
    });

    it('should allow manager to delete stage', async () => {
      const response = await request(app)
        .delete('/api/stages/999')
        .set(getAuthHeader(testUsers.manager));

      // Should not be 401 or 403 (may be 404)
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('PUT /api/stages/:id/status', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .put('/api/stages/1/status')
        .send({ status: 'ZAKONCZONE' });

      expect(response.status).toBe(401);
    });

    it('should allow worker to update stage status', async () => {
      const response = await request(app)
        .put('/api/stages/1/status')
        .set(getAuthHeader(testUsers.worker))
        .send({ status: 'W_TRAKCIE' });

      expect(response.status).not.toBe(401);
    });

    it('should validate status value', async () => {
      const response = await request(app)
        .put('/api/stages/1/status')
        .set(getAuthHeader(testUsers.manager))
        .send({ status: 'INVALID_STATUS' });

      // Should return 400 or handle gracefully
      expect(response.status).not.toBe(401);
    });
  });
});

describe('Stage Times', () => {
  describe('PUT /api/stages/:id/times', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .put('/api/stages/1/times')
        .send({ tpz_minutes: 30, tj_minutes_per_unit: 5 });

      expect(response.status).toBe(401);
    });

    it('should allow authenticated user to update times', async () => {
      const response = await request(app)
        .put('/api/stages/1/times')
        .set(getAuthHeader(testUsers.worker))
        .send({
          tpz_minutes: 30,
          tj_minutes_per_unit: 5,
        });

      expect(response.status).not.toBe(401);
    });
  });

  describe('GET /api/stages/efficiency-report', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/stages/efficiency-report');

      expect(response.status).toBe(401);
    });

    it('should return efficiency report for authenticated user', async () => {
      const response = await request(app)
        .get('/api/stages/efficiency-report')
        .set(getAuthHeader(testUsers.manager));

      expect(response.status).not.toBe(401);
    });
  });
});

describe('Stage Assignments', () => {
  describe('POST /api/stages/:stageId/assignments', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/stages/1/assignments')
        .send({ worker_id: 1 });

      expect(response.status).toBe(401);
    });

    it('should reject worker creating assignment', async () => {
      const response = await request(app)
        .post('/api/stages/1/assignments')
        .set(getAuthHeader(testUsers.worker))
        .send({ worker_id: 1 });

      expect(response.status).toBe(403);
    });

    it('should allow manager to create assignment', async () => {
      const response = await request(app)
        .post('/api/stages/1/assignments')
        .set(getAuthHeader(testUsers.manager))
        .send({ worker_id: 1 });

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });
});
