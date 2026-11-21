import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import { NOTIFICATION_QUEUE_NAME } from '../queues/notificationQueue.js';
import prisma from '../config/db.js';
import simulatedWhatsappService from '../services/simulatedWhatsappService.js';
import { logAudit } from '../utils/auditLogger.js';
import { AUDIT_ACTIONS, NOTIFICATION_STATUS } from '../config/constants.js';
import { emitEvent } from '../events/socket.js';
import logger from '../utils/logger.js';

export const createNotificationWorker = () => {
  const worker = new Worker(
    NOTIFICATION_QUEUE_NAME,
    async (job) => {
      const { notificationId, mobileNumber, message, downloadUrl, forceFail = false } = job.data;
      logger.info(`[Notification Worker] Processing WhatsApp delivery for notification ${notificationId} (Job ${job.id})`);

      const notification = await prisma.notification.findUnique({
        where: { id: notificationId }
      });

      if (!notification) {
        throw new Error(`Notification record ${notificationId} not found`);
      }

      // If already sent, treat as complete (idempotency guard)
      if (notification.status === NOTIFICATION_STATUS.SENT) {
        logger.info(`Notification ${notificationId} already SENT. Skipping duplicate transmission.`);
        return { success: true, alreadySent: true };
      }

      // Mark status as PROCESSING and increment attempts
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: NOTIFICATION_STATUS.PROCESSING,
          attempts: { increment: 1 }
        }
      });

      try {
        const result = await simulatedWhatsappService.sendMessage({
          mobileNumber,
          message,
          downloadUrl,
          attempt: job.attemptsMade + 1,
          forceFail
        });

        // Update DB as SENT
        const updated = await prisma.notification.update({
          where: { id: notificationId },
          data: {
            status: NOTIFICATION_STATUS.SENT,
            sentAt: new Date(),
            lastError: null
          }
        });

        // Audit log
        await logAudit({
          action: AUDIT_ACTIONS.NOTIFICATION_SENT,
          entityType: 'NOTIFICATION',
          entityId: notification.id,
          metadata: {
            mobileNumber,
            providerMessageId: result.providerMessageId,
            attempts: job.attemptsMade + 1
          }
        });

        emitEvent(null, 'notification_updated', {
          notificationId,
          status: NOTIFICATION_STATUS.SENT
        });

        return result;
      } catch (err) {
        const isLastAttempt = job.attemptsMade + 1 >= (job.opts?.attempts || 3);
        const nextStatus = isLastAttempt ? NOTIFICATION_STATUS.FAILED : NOTIFICATION_STATUS.RETRYING;

        await prisma.notification.update({
          where: { id: notificationId },
          data: {
            status: nextStatus,
            lastError: err.message
          }
        });

        await logAudit({
          action: AUDIT_ACTIONS.NOTIFICATION_FAILED,
          entityType: 'NOTIFICATION',
          entityId: notification.id,
          reason: err.message,
          metadata: {
            attempt: job.attemptsMade + 1,
            nextStatus
          }
        });

        emitEvent(null, 'notification_updated', {
          notificationId,
          status: nextStatus,
          error: err.message
        });

        // Re-throw so BullMQ records failure and triggers exponential backoff
        throw err;
      }
    },
    {
      connection: redisConnection,
      concurrency: 5
    }
  );

  worker.on('failed', (job, err) => {
    logger.warn(`[Notification Worker] Job ${job?.id} attempt failed: ${err.message}`);
  });

  return worker;
};

export default createNotificationWorker;
