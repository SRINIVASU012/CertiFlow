import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import { CERTIFICATE_QUEUE_NAME } from '../queues/certificateQueue.js';
import { notificationQueue } from '../queues/notificationQueue.js';
import prisma from '../config/db.js';
import { generateCertificatePdf } from '../services/certificatePdfService.js';
import { generateUniqueCertificateNumber } from '../utils/certificateNumberGenerator.js';
import { logAudit } from '../utils/auditLogger.js';
import { AUDIT_ACTIONS, BATCH_STATUS } from '../config/constants.js';
import { emitEvent } from '../events/socket.js';
import logger from '../utils/logger.js';

export const createCertificateWorker = () => {
  const worker = new Worker(
    CERTIFICATE_QUEUE_NAME,
    async (job) => {
      const { batchId, userId } = job.data;
      logger.info(`[Certificate Worker] Processing certificate generation for Batch ${batchId} (Job ${job.id})`);

      const batch = await prisma.batch.findUnique({
        where: { id: batchId },
        include: {
          trainingCentre: true,
          candidates: true
        }
      });

      if (!batch) {
        throw new Error(`Batch with ID ${batchId} not found.`);
      }

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const createdCertificates = [];

      for (const candidate of batch.candidates) {
        // Idempotency check: see if certificate already exists for candidate
        let certificate = await prisma.certificate.findUnique({
          where: { candidateId: candidate.id }
        });

        if (!certificate) {
          const certNumber = await generateUniqueCertificateNumber(prisma);
          const verificationUrl = `${frontendUrl}/verify/${certNumber}`;
          const pdfFileName = `${certNumber}.pdf`;

          // Generate PDF physically
          await generateCertificatePdf({
            certificateNumber: certNumber,
            candidateName: candidate.name,
            courseName: candidate.courseName,
            trainingCentreName: batch.trainingCentre.name,
            completionDate: candidate.completionDate,
            verificationUrl
          });

          // Create Certificate DB record
          certificate = await prisma.certificate.create({
            data: {
              certificateNumber: certNumber,
              candidateId: candidate.id,
              batchId: batch.id,
              issueDate: new Date(),
              verificationUrl,
              pdfFileName,
              status: 'VALID'
            }
          });

          // Record audit log
          await logAudit({
            userId,
            userRole: 'SYSTEM_WORKER',
            action: AUDIT_ACTIONS.CERTIFICATE_GENERATED,
            entityType: 'CERTIFICATE',
            entityId: certificate.id,
            metadata: {
              certificateNumber: certNumber,
              candidateId: candidate.id,
              candidateName: candidate.name
            }
          });

          // Prepare WhatsApp notification record
          const idempotencyKey = `notif-cert-${certificate.id}`;
          const message = `Congratulations ${candidate.name}! Your official Pragati Skills Mission certificate for ${candidate.courseName} is ready. Access and verify your certificate here: ${verificationUrl}`;

          const notification = await prisma.notification.upsert({
            where: { idempotencyKey },
            update: {},
            create: {
              candidateId: candidate.id,
              certificateId: certificate.id,
              recipientMobile: candidate.mobileNumber,
              channel: 'WHATSAPP',
              message,
              downloadUrl: verificationUrl,
              status: 'PENDING',
              idempotencyKey
            }
          });

          // Queue WhatsApp notification job (use idempotencyKey as jobId to prevent duplicates)
          await notificationQueue.add(
            'send-whatsapp-notification',
            {
              notificationId: notification.id,
              certificateId: certificate.id,
              mobileNumber: candidate.mobileNumber,
              message,
              downloadUrl: verificationUrl
            },
            {
              jobId: idempotencyKey // BullMQ deduplication
            }
          );
        }

        createdCertificates.push(certificate);
      }

      // Update Batch status to COMPLETED
      await prisma.batch.update({
        where: { id: batch.id },
        data: {
          status: BATCH_STATUS.COMPLETED,
          lastActionAt: new Date()
        }
      });

      logger.info(`[Certificate Worker] Completed ${createdCertificates.length} certificates for Batch ${batch.batchNumber}`);

      // Emit real-time updates
      emitEvent(`batch:${batch.id}`, 'batch_updated', {
        batchId: batch.id,
        status: BATCH_STATUS.COMPLETED
      });
      emitEvent('role:TRAINING_CENTRE', 'certificates_ready', {
        batchId: batch.id,
        count: createdCertificates.length
      });
      emitEvent('role:STATE_OFFICE', 'certificates_ready', {
        batchId: batch.id,
        count: createdCertificates.length
      });

      return {
        batchId: batch.id,
        certificatesCount: createdCertificates.length
      };
    },
    {
      connection: redisConnection,
      concurrency: 5
    }
  );

  worker.on('failed', (job, err) => {
    logger.error(`[Certificate Worker] Job ${job?.id} failed: ${err.message}`, err);
  });

  return worker;
};

export default createCertificateWorker;
