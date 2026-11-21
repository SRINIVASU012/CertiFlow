import request from 'supertest';
import app from '../app.js';
import prisma from '../config/db.js';

describe('Auth & Role-Based Access Control', () => {
  beforeAll(async () => {
    // Ensure DB connection is active
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should authenticate demo user Anika with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'anika@pragati.org',
        password: 'Password@123'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('TRAINING_CENTRE');
    expect(res.body.data.user.email).toBe('anika@pragati.org');
  });

  it('should reject invalid password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'anika@pragati.org',
        password: 'WrongPassword999'
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Invalid email or password');
  });

  it('should reject non-existent email with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'unknown.user@pragati.org',
        password: 'Password@123'
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return current user profile on GET /api/auth/me with valid Bearer token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'farah@pragati.org',
        password: 'Password@123'
      });

    const token = loginRes.body.data.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.statusCode).toBe(200);
    expect(meRes.body.data.user.name).toBe('Farah Khan');
    expect(meRes.body.data.user.role).toBe('STATE_OFFICE');
  });

  it('should block unauthenticated access to protected routes', async () => {
    const res = await request(app).get('/api/batches');
    expect(res.statusCode).toBe(401);
  });
});
