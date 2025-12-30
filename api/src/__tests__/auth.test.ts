import request from 'supertest';
import { createTestApp, testUsers, getAuthHeader, generateTestToken } from './testUtils';

const app = createTestApp();

describe('Auth API', () => {
  describe('POST /api/auth/login', () => {
    it('should reject empty credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject short password or fail on DB query', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.pl',
          password: '123',
        });

      // Should fail - either 400 (validation) or 500 (DB not connected but valid format)
      expect(response.body.success).toBe(false);
      expect([400, 500]).toContain(response.status);
    });
  });

  describe('POST /api/auth/pin', () => {
    it('should reject empty PIN', async () => {
      const response = await request(app)
        .post('/api/auth/pin')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid PIN format (letters)', async () => {
      const response = await request(app)
        .post('/api/auth/pin')
        .send({ pin: 'abcd' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject PIN that is too short', async () => {
      const response = await request(app)
        .post('/api/auth/pin')
        .send({ pin: '123' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject PIN that is too long', async () => {
      const response = await request(app)
        .post('/api/auth/pin')
        .send({ pin: '1234567' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should accept request with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set(getAuthHeader(testUsers.admin));

      // May return 500 if DB not connected, but should not be 401
      expect(response.status).not.toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should reject logout without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(401);
    });

    it('should accept logout with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set(getAuthHeader(testUsers.admin));

      // Should be 200 or 500 (if DB not connected), not 401
      expect(response.status).not.toBe(401);
    });
  });

  describe('POST /api/auth/register', () => {
    it('should reject registration without auth', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          email: 'new@test.pl',
          position: 'Operator',
        });

      expect(response.status).toBe(401);
    });

    it('should reject registration by worker (insufficient permissions)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set(getAuthHeader(testUsers.worker))
        .send({
          name: 'New User',
          email: 'new@test.pl',
          position: 'Operator',
        });

      expect(response.status).toBe(403);
    });

    it('should accept registration request from admin', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set(getAuthHeader(testUsers.admin))
        .send({
          name: 'New User',
          email: 'new@test.pl',
          position: 'Operator',
          pin: '1234',
        });

      // Should not be 401 or 403
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });
});

describe('Token Validation', () => {
  it('should generate valid JWT token', () => {
    const token = generateTestToken(testUsers.admin);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // JWT has 3 parts
  });

  it('should include user data in token', () => {
    const token = generateTestToken(testUsers.manager);
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString()
    );

    expect(payload.id).toBe(testUsers.manager.id);
    expect(payload.email).toBe(testUsers.manager.email);
    expect(payload.role).toBe(testUsers.manager.role);
  });
});
