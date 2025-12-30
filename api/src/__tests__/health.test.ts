import request from 'supertest';
import { createTestApp } from './testUtils';

const app = createTestApp();

describe('Health Check API', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
    });

    it('should return environment info', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.body).toHaveProperty('environment');
      expect(response.body.environment).toBe('test');
    });

    it('should not require authentication', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(200);
    });
  });
});

describe('Not Found Handler', () => {
  it('should return 404 for unknown routes', async () => {
    const response = await request(app)
      .get('/api/unknown-route');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('should return 404 for non-API routes', async () => {
    const response = await request(app)
      .get('/unknown');

    expect(response.status).toBe(404);
  });
});
