import prisma from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';
import { AUDIT_ACTIONS, BATCH_STATUS } from '../config/constants.js';
import { emitEvent } from '../events/socket.js';
import logger from '../utils/logger.js';

/**
 * Checks for batches that have exceeded the pending review duration
 * and records reminder/escalation events.
 */
export async function checkDelayedBatches(thresholdHours = 24) {
  logger.info(`[Delayed Batch Monitor] Running check for batches delayed > ${thresholdHours} hours`);

  const cutoff = new Date(Date.now() - thresholdHours * 3600 * 1000);

  const pendingStatuses = [
    BATCH_STATUS.SUBMITTED,
    BATCH_STATUS.DISTRICT_REVIEW,
    BATCH_STATUS.QUALITY_REVIEW,
    BATCH_STATUS.STATE_REVIEW
  ];

  const delayedBatches = await prisma.batch.findMany({
    where: {
      status: { in: pendingStatuses },
      lastActionAt: { lt: cutoff }
    },
    include: {
      trainingCentre: true,
      district: true
    }
  });

  logger.info(`[Delayed Batch Monitor] Found ${delayedBatches.length} delayed batches`);

  for (const batch of delayedBatches) {
    const hoursDelayed = Math.round((Date.now() - new Date(batch.lastActionAt).getTime()) / (3600 * 1000));

    // Log escalation audit event
    await logAudit({
      action: AUDIT_ACTIONS.DELAYED_BATCH_ALERT,
      entityType: 'BATCH',
      entityId: batch.id,
      reason: `Batch ${batch.batchNumber} has been waiting in status '${batch.status}' for ${hoursDelayed} hours without action.`,
      metadata: {
        batchNumber: batch.batchNumber,
        status: batch.status,
        hoursDelayed,
        district: batch.district.name,
        trainingCentre: batch.trainingCentre.name
      }
    });

    // Notify State Office and relevant district room
    emitEvent('role:STATE_OFFICE', 'delayed_batch_alert', {
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      status: batch.status,
      hoursDelayed
    });
  }

  return delayedBatches;
}

export default checkDelayedBatches;
