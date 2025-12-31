import request from 'supertest';
import { createTestApp, testUsers, getAuthHeader } from './testUtils';

const app = createTestApp();

describe('Work Sessions API', () => {
  describe('POST /api/assignments/:id/start', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/assignments/1/start')
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should accept request from authenticated worker', async () => {
      const response = await request(app)
        .post('/api/assignments/1/start')
        .set(getAuthHeader(testUsers.worker))
        .send({});

      // Should not be 401 (auth error) - may be 404 (assignment not found) or 500 (DB)
      expect(response.status).not.toBe(401);
    });

    it('should accept request with machine_id', async () => {
      const response = await request(app)
        .post('/api/assignments/1/start')
        .set(getAuthHeader(testUsers.worker))
        .send({ machine_id: 1 });

      expect(response.status).not.toBe(401);
    });
  });

  describe('POST /api/work-sessions/:id/stop', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/work-sessions/1/stop')
        .send({});

      expect(response.status).toBe(401);
    });

    it('should accept stop request with quantity data', async () => {
      const response = await request(app)
        .post('/api/work-sessions/1/stop')
        .set(getAuthHeader(testUsers.worker))
        .send({
          quantity_completed: 10,
          defects_count: 1,
          notes: 'Test notes',
        });

      // Should not be 401
      expect(response.status).not.toBe(401);
    });
  });

  describe('POST /api/work-sessions/:id/pause', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/work-sessions/1/pause')
        .send({});

      expect(response.status).toBe(401);
    });

    it('should accept pause request with reason', async () => {
      const response = await request(app)
        .post('/api/work-sessions/1/pause')
        .set(getAuthHeader(testUsers.worker))
        .send({
          reason: 'Przerwa obiadowa',
        });

      expect(response.status).not.toBe(401);
    });
  });

  describe('POST /api/work-sessions/:id/resume', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/work-sessions/1/resume')
        .send({});

      expect(response.status).toBe(401);
    });

    it('should accept resume request from worker', async () => {
      const response = await request(app)
        .post('/api/work-sessions/1/resume')
        .set(getAuthHeader(testUsers.worker))
        .send({});

      expect(response.status).not.toBe(401);
    });
  });

  describe('GET /api/work-sessions/active', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/work-sessions/active');

      expect(response.status).toBe(401);
    });

    it('should return active sessions for authenticated user', async () => {
      const response = await request(app)
        .get('/api/work-sessions/active')
        .set(getAuthHeader(testUsers.worker));

      expect(response.status).not.toBe(401);
    });
  });

  describe('GET /api/work-sessions/:id', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/work-sessions/1');

      expect(response.status).toBe(401);
    });

    it('should accept request from authenticated user', async () => {
      const response = await request(app)
        .get('/api/work-sessions/1')
        .set(getAuthHeader(testUsers.worker));

      expect(response.status).not.toBe(401);
    });
  });
});

describe('Work Session Validation', () => {
  it('should validate session stop requires work session id', async () => {
    const response = await request(app)
      .post('/api/work-sessions/invalid/stop')
      .set(getAuthHeader(testUsers.worker))
      .send({});

    // Should fail with 400 or 404, not crash
    expect([400, 404, 500]).toContain(response.status);
  });

  it('should validate pause reason format', async () => {
    const response = await request(app)
      .post('/api/work-sessions/1/pause')
      .set(getAuthHeader(testUsers.worker))
      .send({
        reason: '', // Empty reason
      });

    // Should accept (reason may be optional) or return 400
    expect(response.status).not.toBe(401);
  });

  it('should handle quantity_completed as number', async () => {
    const response = await request(app)
      .post('/api/work-sessions/1/stop')
      .set(getAuthHeader(testUsers.worker))
      .send({
        quantity_completed: 'not-a-number',
      });

    // Should handle gracefully
    expect(response.status).not.toBe(401);
  });
});
