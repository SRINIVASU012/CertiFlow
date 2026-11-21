import request from 'supertest';
import app from '../app.js';
import prisma from '../config/db.js';

describe('TEST 6: Return and Resubmission Cycle Policy', () => {
  let devToken, anikaToken;
  let testBatch;

  beforeAll(async () => {
    const [devRes, anikaRes] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'dev@pragati.org', password: 'Password@123' }),
      request(app).post('/api/auth/login').send({ email: 'anika@pragati.org', password: 'Password@123' })
    ]);
    devToken = devRes.body.data.token;
    anikaToken = anikaRes.body.data.token;

    // Create a batch in DISTRICT_REVIEW with cycle = 1
    const batchRes = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${anikaToken}`)
      .send({
        batchName: 'Resubmission Policy Test Batch',
        courseName: 'Industrial Electrician'
      });
    testBatch = batchRes.body.data.batch;

    await prisma.candidate.create({
      data: {
        batchId: testBatch.id,
        candidateIdentifier: 'IND-01',
        name: 'Trainee 1',
        email: 't1@example.com',
        mobileNumber: '+919876543200',
        courseName: 'Industrial Electrician',
        completionDate: new Date('2026-02-10')
      }
    });

    await prisma.batch.update({
      where: { id: testBatch.id },
      data: { status: 'DISTRICT_REVIEW', candidateCount: 1, submissionCycle: 1 }
    });
  });

  afterAll(async () => {
    if (testBatch?.id) {
      await prisma.districtApproval.deleteMany({ where: { batchId: testBatch.id } });
      await prisma.candidate.deleteMany({ where: { batchId: testBatch.id } });
      await prisma.batch.delete({ where: { id: testBatch.id } }).catch(() => {});
    }
  });

  it('should return batch with mandatory reason and preserve record in history', async () => {
    const returnReason = 'Candidate completion date does not match batch practical schedule.';
    const returnRes = await request(app)
      .post(`/api/district/batches/${testBatch.id}/return`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ reason: returnReason });

    expect(returnRes.statusCode).toBe(200);
    expect(returnRes.body.data.batch.status).toBe('RETURNED');
    expect(returnRes.body.data.batch.returnReason).toBe(returnReason);

    // Verify record in DistrictApproval table
    const returnRecord = await prisma.districtApproval.findFirst({
      where: { batchId: testBatch.id, decision: 'RETURNED' }
    });
    expect(returnRecord).toBeDefined();
    expect(returnRecord.submissionCycle).toBe(1);
  });

  it('should resubmit batch with incremented submission cycle (Cycle 2)', async () => {
    const resubmitRes = await request(app)
      .post(`/api/batches/${testBatch.id}/resubmit`)
      .set('Authorization', `Bearer ${anikaToken}`);

    expect(resubmitRes.statusCode).toBe(200);
    expect(resubmitRes.body.success).toBe(true);
    expect(resubmitRes.body.data.batch.status).toBe('DISTRICT_REVIEW');
    expect(resubmitRes.body.data.batch.submissionCycle).toBe(2);
    expect(resubmitRes.body.data.batch.returnReason).toBeNull();
  });

  it('should verify prior approvals from Cycle 1 do NOT automatically count towards Cycle 2', async () => {
    // Current approvals for cycle 2 must be 0
    const cycle2ApprovalsCount = await prisma.districtApproval.count({
      where: {
        batchId: testBatch.id,
        submissionCycle: 2,
        decision: 'APPROVED'
      }
    });
    expect(cycle2ApprovalsCount).toBe(0);

    // Prior cycle 1 approvals remain preserved in DB for permanent audit
    const cycle1RecordsCount = await prisma.districtApproval.count({
      where: {
        batchId: testBatch.id,
        submissionCycle: 1
      }
    });
    expect(cycle1RecordsCount).toBeGreaterThan(0);
  });
});
