import simulatedWhatsappService from '../services/simulatedWhatsappService.js';
import prisma from '../config/db.js';

describe('TEST 8: Background Worker Reliability, Idempotency & Simulated WhatsApp Retries', () => {
  it('should successfully deliver simulated WhatsApp notification on valid recipient', async () => {
    const res = await simulatedWhatsappService.sendMessage({
      mobileNumber: '+919876543210',
      message: 'Your CertiFlow certificate is ready.',
      downloadUrl: 'http://localhost:5173/verify/CERT-2026-000001',
      attempt: 1
    });

    expect(res.success).toBe(true);
    expect(res.status).toBe('DELIVERED');
    expect(res.providerMessageId).toBeDefined();
  });

  it('should simulate gateway timeout and mark as retryable when forceFail is active', async () => {
    await expect(
      simulatedWhatsappService.sendMessage({
        mobileNumber: '+919876543210',
        message: 'Your certificate is ready.',
        downloadUrl: 'http://localhost:5173/verify/CERT-2026-000001',
        attempt: 1,
        forceFail: true
      })
    ).rejects.toThrow('Simulated WhatsApp Gateway Error');
  });

  it('should enforce idempotency: duplicate notification jobs must not send duplicate messages', async () => {
    const idempotencyKey = `test-idemp-${Date.now()}`;

    // Create a notification record with status SENT
    const notif = await prisma.notification.create({
      data: {
        candidateId: (await prisma.candidate.findFirst()).id,
        certificateId: (await prisma.certificate.findFirst()).id,
        recipientMobile: '+919876500099',
        message: 'Idempotency test',
        downloadUrl: 'http://localhost:5173/verify/test',
        status: 'SENT',
        sentAt: new Date(),
        idempotencyKey
      }
    });

    // Attempting to create duplicate with same idempotency key fails or is caught
    await expect(
      prisma.notification.create({
        data: {
          candidateId: notif.candidateId,
          certificateId: notif.certificateId,
          recipientMobile: notif.recipientMobile,
          message: notif.message,
          downloadUrl: notif.downloadUrl,
          idempotencyKey
        }
      })
    ).rejects.toThrow();

    // Clean up
    await prisma.notification.delete({ where: { id: notif.id } });
  });
});
