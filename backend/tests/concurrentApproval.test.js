import request from 'supertest';
import app from '../app.js';
import prisma from '../config/db.js';

describe('TEST 2: Two District Officers & Concurrent Approvals', () => {
  let devToken, meeraToken, anikaToken;
  let testBatch;

  beforeAll(async () => {
    const [devRes, meeraRes, anikaRes] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'dev@pragati.org', password: 'Password@123' }),
      request(app).post('/api/auth/login').send({ email: 'meera@pragati.org', password: 'Password@123' }),
      request(app).post('/api/auth/login').send({ email: 'anika@pragati.org', password: 'Password@123' })
    ]);

    devToken = devRes.body.data.token;
    meeraToken = meeraRes.body.data.token;
    anikaToken = anikaRes.body.data.token;

    // Create a batch with candidates and submit it to DISTRICT_REVIEW
    const batchRes = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${anikaToken}`)
      .send({
        batchName: 'Concurrent Approval Test Cohort',
        courseName: 'Robotics Automation'
      });
    testBatch = batchRes.body.data.batch;

    // Add 10 candidates directly
    const candidates = [];
    for (let i = 1; i <= 10; i++) {
      candidates.push({
        batchId: testBatch.id,
        candidateIdentifier: `ROB-${i}`,
        name: `Robotics Trainee ${i}`,
        email: `rob${i}@example.com`,
        mobileNumber: `+9198700${String(10000 + i).slice(-5)}`,
        courseName: 'Robotics Automation',
        completionDate: new Date('2026-02-15')
      });
    }
    await prisma.candidate.createMany({ data: candidates });
    await prisma.batch.update({
      where: { id: testBatch.id },
      data: { candidateCount: 10, status: 'DISTRICT_REVIEW' }
    });
  });

  afterAll(async () => {
    if (testBatch?.id) {
      await prisma.districtApproval.deleteMany({ where: { batchId: testBatch.id } });
      await prisma.candidate.deleteMany({ where: { batchId: testBatch.id } });
      await prisma.batch.delete({ where: { id: testBatch.id } }).catch(() => {});
    }
  });

  it('should not allow the same officer (Dev) to approve twice in the same cycle', async () => {
    // Dev approves 1st time
    const res1 = await request(app)
      .post(`/api/district/batches/${testBatch.id}/approve`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ reason: 'First review completed by Dev.' });

    expect(res1.statusCode).toBe(200);
    expect(res1.body.data.approvalsCount).toBe(1);
    expect(res1.body.data.advanced).toBe(false);

    // Dev attempts to approve a 2nd time
    const res2 = await request(app)
      .post(`/api/district/batches/${testBatch.id}/approve`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ reason: 'Attempting duplicate approval.' });

    expect(res2.statusCode).toBe(400);
    expect(res2.body.error.message).toContain('already approved');
  });

  it('should advance batch to STATE_REVIEW when second distinct officer (Meera) approves', async () => {
    const res = await request(app)
      .post(`/api/district/batches/${testBatch.id}/approve`)
      .set('Authorization', `Bearer ${meeraToken}`)
      .send({ reason: 'Second district review completed by Meera.' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.approvalsCount).toBe(2);
    expect(res.body.data.advanced).toBe(true);
    // Since candidateCount is 10 (< 50 threshold), it moves to STATE_REVIEW
    expect(res.body.data.nextStatus).toBe('STATE_REVIEW');

    const updated = await prisma.batch.findUnique({ where: { id: testBatch.id } });
    expect(updated.status).toBe('STATE_REVIEW');
  });
});
