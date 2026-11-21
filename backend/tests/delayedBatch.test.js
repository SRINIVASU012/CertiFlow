import request from 'supertest';
import app from '../app.js';
import prisma from '../config/db.js';
import { checkDelayedBatches } from '../workers/delayedBatchWorker.js';

describe('TEST 5: Delayed Batch SLA Monitoring', () => {
  let farahToken;
  let delayedBatch;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'farah@pragati.org', password: 'Password@123' });
    farahToken = loginRes.body.data.token;

    // Seed or find a batch with lastActionAt > 24 hours ago
    const tc = await prisma.trainingCentre.findFirst();
    delayedBatch = await prisma.batch.create({
      data: {
        batchNumber: `BATCH-TEST-DELAYED-${Date.now()}`,
        batchName: 'Delayed Monitoring SLA Test Cohort',
        courseName: 'Precision Lathe Operations',
        trainingCentreId: tc.id,
        districtId: tc.districtId,
        status: 'DISTRICT_REVIEW',
        candidateCount: 12,
        lastActionAt: new Date(Date.now() - 36 * 3600 * 1000) // 36 hours ago (> 24h threshold)
      }
    });
  });

  afterAll(async () => {
    if (delayedBatch?.id) {
      await prisma.batch.delete({ where: { id: delayedBatch.id } }).catch(() => {});
    }
  });

  it('should identify delayed batches and record escalation audit alerts', async () => {
    const delayed = await checkDelayedBatches(24);
    expect(delayed.some((b) => b.id === delayedBatch.id)).toBe(true);

    // Verify audit log entry created
    const alertAudit = await prisma.auditLog.findFirst({
      where: {
        entityId: delayedBatch.id,
        action: 'DELAYED_BATCH_ALERT'
      }
    });
    expect(alertAudit).toBeDefined();
    expect(alertAudit.reason).toContain('waiting');
  });

  it('should expose delayed batches on State Office /api/state/delayed endpoint', async () => {
    const res = await request(app)
      .get('/api/state/delayed')
      .set('Authorization', `Bearer ${farahToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    const found = res.body.data.batches.find((b) => b.id === delayedBatch.id);
    expect(found).toBeDefined();
    expect(found.delayedHours).toBeGreaterThanOrEqual(35);
  });
});
