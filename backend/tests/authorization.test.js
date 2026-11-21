import request from 'supertest';
import app from '../app.js';

describe('TEST 7: Role-Based Authorization & Cross-Role Security Checks', () => {
  let anikaToken, devToken, nehaToken, farahToken;

  beforeAll(async () => {
    const [anika, dev, neha, farah] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'anika@pragati.org', password: 'Password@123' }),
      request(app).post('/api/auth/login').send({ email: 'dev@pragati.org', password: 'Password@123' }),
      request(app).post('/api/auth/login').send({ email: 'neha@pragati.org', password: 'Password@123' }),
      request(app).post('/api/auth/login').send({ email: 'farah@pragati.org', password: 'Password@123' })
    ]);

    anikaToken = anika.body.data.token;
    devToken = dev.body.data.token;
    nehaToken = neha.body.data.token;
    farahToken = farah.body.data.token;
  });

  it('should block Training Centre (Anika) from performing district approval (403)', async () => {
    const res = await request(app)
      .post('/api/district/batches/some-batch-id/approve')
      .set('Authorization', `Bearer ${anikaToken}`)
      .send({ reason: 'Unauthorized attempt' });

    expect(res.statusCode).toBe(403);
    expect(res.body.error.message).toContain('Access denied');
  });

  it('should block District Officer (Dev) from cancelling certificates (403)', async () => {
    const res = await request(app)
      .post('/api/certificates/some-cert-id/cancel')
      .set('Authorization', `Bearer ${devToken}`)
      .send({ reason: 'Unauthorized cancel attempt' });

    expect(res.statusCode).toBe(403);
    expect(res.body.error.message).toContain('Access denied');
  });

  it('should block Quality Team (Neha) from performing final state approval (403)', async () => {
    const res = await request(app)
      .post('/api/state/batches/some-batch-id/approve')
      .set('Authorization', `Bearer ${nehaToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.error.message).toContain('Access denied');
  });

  it('should block Training Centre (Anika) from viewing state audit logs (403)', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${anikaToken}`);

    expect(res.statusCode).toBe(403);
  });
});
