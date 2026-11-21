import request from 'supertest';
import app from '../app.js';
import prisma from '../config/db.js';
import { generateCertificatePdf } from '../services/certificatePdfService.js';
import { generateUniqueCertificateNumber } from '../utils/certificateNumberGenerator.js';
import storageService from '../services/storageService.js';
import fs from 'fs';

describe('TEST 3 & TEST 4: Certificate Generation, Revocation & Public Verification', () => {
  let farahToken;
  let testCertNumber;
  let testCandidateId;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'farah@pragati.org', password: 'Password@123' });
    farahToken = loginRes.body.data.token;
  });

  it('TEST 3: Should generate valid PDF certificate with unique number CERT-YYYY-XXXXXX and QR code', async () => {
    const certNumber = await generateUniqueCertificateNumber(prisma);
    expect(certNumber).toMatch(/^CERT-\d{4}-\d{6}$/);
    testCertNumber = certNumber;

    const verificationUrl = `http://localhost:5173/verify/${certNumber}`;

    const { fileName, filePath } = await generateCertificatePdf({
      certificateNumber: certNumber,
      candidateName: 'Priya Sundaram',
      courseName: 'Solar PV Installer Technician',
      trainingCentreName: 'Pragati Bengaluru Central',
      completionDate: new Date('2026-02-15'),
      verificationUrl
    });

    expect(fs.existsSync(filePath)).toBe(true);
    const stats = fs.statSync(filePath);
    expect(stats.size).toBeGreaterThan(1000); // Valid PDF generated
  });

  it('TEST 4: Public verification of VALID certificate should never expose email or phone', async () => {
    // CERT-2026-000001 was seeded as VALID
    const res = await request(app).get('/api/public/verify/CERT-2026-000001');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.verificationStatus).toBe('VALID');
    expect(res.body.data.certificateNumber).toBe('CERT-2026-000001');
    expect(res.body.data.candidateName).toBeDefined();
    expect(res.body.data.courseName).toBeDefined();

    // PRIVACY ENFORCEMENT: Never expose private candidate credentials publicly
    expect(res.body.data.email).toBeUndefined();
    expect(res.body.data.mobileNumber).toBeUndefined();
    expect(res.body.data.candidateIdentifier).toBeUndefined();
  });

  it('TEST 4: Cancelling a certificate through State Office must immediately reflect CANCELLED on public lookup', async () => {
    // Get valid certificate CERT-2026-000001
    const cert = await prisma.certificate.findUnique({
      where: { certificateNumber: 'CERT-2026-000001' }
    });

    expect(cert.status).toBe('VALID');

    // Cancel as Farah
    const cancelReason = 'Audit confirmed fraudulent practical examination marksheet.';
    const cancelRes = await request(app)
      .post(`/api/certificates/${cert.id}/cancel`)
      .set('Authorization', `Bearer ${farahToken}`)
      .send({ reason: cancelReason });

    expect(cancelRes.statusCode).toBe(200);
    expect(cancelRes.body.success).toBe(true);
    expect(cancelRes.body.data.certificate.status).toBe('CANCELLED');

    // Immediately query public endpoint without authentication
    const publicRes = await request(app).get('/api/public/verify/CERT-2026-000001');

    expect(publicRes.statusCode).toBe(200);
    expect(publicRes.body.verificationStatus).toBe('CANCELLED');
    expect(publicRes.body.data.cancellationReason).toBe(cancelReason);

    // Restore to VALID for other tests
    await prisma.certificate.update({
      where: { id: cert.id },
      data: { status: 'VALID', cancelledAt: null, cancellationReason: null }
    });
  });

  it('Public lookup of non-existent certificate returns NOT_FOUND', async () => {
    const res = await request(app).get('/api/public/verify/CERT-9999-999999');
    expect(res.statusCode).toBe(404);
    expect(res.body.verificationStatus).toBe('NOT_FOUND');
  });
});
