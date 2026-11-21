import request from 'supertest';
import app from '../app.js';
import prisma from '../config/db.js';
import xlsx from 'xlsx';

describe('TEST 1: Spreadsheet Upload & Atomic Validation', () => {
  let anikaToken;
  let testBatch;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'anika@pragati.org', password: 'Password@123' });
    anikaToken = loginRes.body.data.token;

    // Create a fresh test batch in DRAFT status
    const batchRes = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${anikaToken}`)
      .send({
        batchName: 'Spreadsheet Atomic Test Batch',
        courseName: 'Precision Welding Technology'
      });
    testBatch = batchRes.body.data.batch;
  });

  afterAll(async () => {
    if (testBatch?.id) {
      await prisma.candidate.deleteMany({ where: { batchId: testBatch.id } });
      await prisma.batch.delete({ where: { id: testBatch.id } }).catch(() => {});
    }
  });

  it('should reject invalid spreadsheet, report exact row numbers and fields, and save ZERO candidates', async () => {
    // Create an invalid spreadsheet buffer with multiple errors:
    // Row 2 (Excel row 2): Missing candidate name
    // Row 3 (Excel row 3): Invalid email format
    // Row 4 (Excel row 4): Duplicate Candidate Identifier
    // Row 5 (Excel row 5): Invalid date string
    const invalidRows = [
      {
        'Candidate Identifier': 'CAND-TEST-001',
        'Candidate Name': '', // ERROR: Blank name
        'Candidate Email': 'valid1@example.com',
        'Mobile Number': '+919876543201',
        'Course Name': 'Welding Tech',
        'Training Completion Date': '2026-02-15'
      },
      {
        'Candidate Identifier': 'CAND-TEST-002',
        'Candidate Name': 'Vikram Singh',
        'Candidate Email': 'not-an-email', // ERROR: Invalid email
        'Mobile Number': '+919876543202',
        'Course Name': 'Welding Tech',
        'Training Completion Date': '2026-02-15'
      },
      {
        'Candidate Identifier': 'CAND-TEST-002', // ERROR: Duplicate identifier
        'Candidate Name': 'Anita Roy',
        'Candidate Email': 'anita@example.com',
        'Mobile Number': '+919876543203',
        'Course Name': 'Welding Tech',
        'Training Completion Date': 'invalid-date-format' // ERROR: Bad date
      }
    ];

    const ws = xlsx.utils.json_to_sheet(invalidRows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Candidates');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const uploadRes = await request(app)
      .post(`/api/batches/${testBatch.id}/upload`)
      .set('Authorization', `Bearer ${anikaToken}`)
      .attach('file', buffer, 'invalid_candidates.xlsx');

    expect(uploadRes.statusCode).toBe(422);
    expect(uploadRes.body.success).toBe(false);
    expect(uploadRes.body.error.errorsCount).toBeGreaterThan(0);

    const errors = uploadRes.body.error.errors;
    // Verify exact row reporting
    expect(errors.some((e) => e.row === 2 && e.field === 'Candidate Name')).toBe(true);
    expect(errors.some((e) => e.row === 3 && e.field === 'Candidate Email')).toBe(true);
    expect(errors.some((e) => e.row === 4 && e.field === 'Candidate Identifier')).toBe(true);

    // CRITICAL ATOMIC VERIFICATION: Ensure NO candidates were partially saved in the database
    const savedCandidatesCount = await prisma.candidate.count({
      where: { batchId: testBatch.id }
    });
    expect(savedCandidatesCount).toBe(0);
  });

  it('should successfully import valid spreadsheet when all rows pass validation', async () => {
    const validRows = [
      {
        'Candidate Identifier': 'CAND-VALID-001',
        'Candidate Name': 'Kiran Rao',
        'Candidate Email': 'kiran.rao@example.com',
        'Mobile Number': '+919876543220',
        'Course Name': 'Precision Welding Technology',
        'Training Completion Date': '2026-02-20'
      },
      {
        'Candidate Identifier': 'CAND-VALID-002',
        'Candidate Name': 'Deepa Nair',
        'Candidate Email': 'deepa.nair@example.com',
        'Mobile Number': '+919876543221',
        'Course Name': 'Precision Welding Technology',
        'Training Completion Date': '2026-02-20'
      }
    ];

    const ws = xlsx.utils.json_to_sheet(validRows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Candidates');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const uploadRes = await request(app)
      .post(`/api/batches/${testBatch.id}/upload`)
      .set('Authorization', `Bearer ${anikaToken}`)
      .attach('file', buffer, 'valid_candidates.xlsx');

    expect(uploadRes.statusCode).toBe(200);
    expect(uploadRes.body.success).toBe(true);
    expect(uploadRes.body.data.candidateCount).toBe(2);

    // Verify DB count
    const savedCount = await prisma.candidate.count({
      where: { batchId: testBatch.id }
    });
    expect(savedCount).toBe(2);
  });
});
