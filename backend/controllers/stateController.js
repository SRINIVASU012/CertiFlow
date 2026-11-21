import prisma from '../config/db.js';
import { certificateQueue } from '../queues/certificateQueue.js';
import { logAudit } from '../utils/auditLogger.js';
import { AUDIT_ACTIONS, BATCH_STATUS, CERTIFICATE_STATUS, NOTIFICATION_STATUS } from '../config/constants.js';
import { emitEvent } from '../events/socket.js';
import logger from '../utils/logger.js';

/**
 * State Office Dashboard Metrics
 */
export const getStateDashboardMetrics = async (req, res) => {
  try {
    const [
      totalBatches,
      pendingFinalApproval,
      approvedBatches,
      rejectedBatches,
      returnedBatches,
      totalCertificates,
      cancelledCertificates,
      notificationFailures
    ] = await Promise.all([
      prisma.batch.count(),
      prisma.batch.count({ where: { status: BATCH_STATUS.STATE_REVIEW } }),
      prisma.batch.count({ where: { status: { in: [BATCH_STATUS.APPROVED, BATCH_STATUS.COMPLETED] } } }),
      prisma.batch.count({ where: { status: BATCH_STATUS.REJECTED } }),
      prisma.batch.count({ where: { status: BATCH_STATUS.RETURNED } }),
      prisma.certificate.count(),
      prisma.certificate.count({ where: { status: CERTIFICATE_STATUS.CANCELLED } }),
      prisma.notification.count({ where: { status: NOTIFICATION_STATUS.FAILED } })
    ]);

    // Calculate delayed batches (pending reviews where lastActionAt > 24 hours)
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000);
    const delayedBatches = await prisma.batch.count({
      where: {
        status: {
          in: [
            BATCH_STATUS.SUBMITTED,
            BATCH_STATUS.DISTRICT_REVIEW,
            BATCH_STATUS.QUALITY_REVIEW,
            BATCH_STATUS.STATE_REVIEW
          ]
        },
        lastActionAt: { lt: cutoff }
      }
    });

    return res.json({
      success: true,
      data: {
        metrics: {
          totalBatches,
          pendingFinalApproval,
          approvedBatches,
          rejectedBatches,
          returnedBatches,
          totalCertificates,
          cancelledCertificates,
          delayedBatches,
          notificationFailures
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching state dashboard metrics:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve state dashboard metrics.' }
    });
  }
};

/**
 * Final State Approval for a batch.
 * Triggers asynchronous BullMQ certificate generation and WhatsApp notifications!
 */
export const approveBatchFinal = async (req, res) => {
  try {
    const { id } = req.params;

    const batch = await prisma.batch.findUnique({
      where: { id },
      include: { candidates: true }
    });

    if (!batch) {
      return res.status(404).json({ success: false, error: { message: 'Batch not found.' } });
    }

    if (batch.status !== BATCH_STATUS.STATE_REVIEW) {
      return res.status(400).json({
        success: false,
        error: { message: `Batch cannot receive final approval in '${batch.status}' status. Must be in STATE_REVIEW.` }
      });
    }

    if (batch.candidates.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot approve batch with zero candidates.' }
      });
    }

    // Atomic update of batch status to CERTIFICATES_GENERATING
    const updatedBatch = await prisma.batch.update({
      where: { id: batch.id },
      data: {
        status: BATCH_STATUS.CERTIFICATES_GENERATING,
        lastActionAt: new Date()
      }
    });

    // Record state approval audit log
    await logAudit({
      userId: req.user.id,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.STATE_APPROVED,
      entityType: 'BATCH',
      entityId: batch.id,
      previousStatus: BATCH_STATUS.STATE_REVIEW,
      newStatus: BATCH_STATUS.CERTIFICATES_GENERATING,
      metadata: {
        candidateCount: batch.candidates.length,
        approverName: req.user.name
      }
    });

    // Enqueue certificate generation job in BullMQ
    await certificateQueue.add(
      'generate-batch-certificates',
      {
        batchId: batch.id,
        userId: req.user.id
      },
      {
        jobId: `batch-cert-gen-${batch.id}-${batch.submissionCycle}`
      }
    );

    emitEvent(`batch:${id}`, 'batch_state_approved', {
      batchId: id,
      status: BATCH_STATUS.CERTIFICATES_GENERATING
    });

    return res.json({
      success: true,
      message: `Final approval granted! Certificate generation started for ${batch.candidates.length} candidates in the background.`,
      data: { batch: updatedBatch }
    });
  } catch (error) {
    logger.error('Error in final state approval:', error);
    return res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to approve batch.' }
    });
  }
};

/**
 * State Office Batch Rejection (Reason mandatory)
 */
export const rejectBatchFinal = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Rejection reason is mandatory.' }
      });
    }

    const batch = await prisma.batch.findUnique({ where: { id } });
    if (!batch) {
      return res.status(404).json({ success: false, error: { message: 'Batch not found.' } });
    }

    const updatedBatch = await prisma.batch.update({
      where: { id: batch.id },
      data: {
        status: BATCH_STATUS.REJECTED,
        rejectionReason: reason,
        lastActionAt: new Date()
      }
    });

    await logAudit({
      userId: req.user.id,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.STATE_REJECTED,
      entityType: 'BATCH',
      entityId: batch.id,
      previousStatus: batch.status,
      newStatus: BATCH_STATUS.REJECTED,
      reason
    });

    emitEvent(`batch:${id}`, 'batch_rejected', { batchId: id, reason });

    return res.json({
      success: true,
      message: 'Batch rejected by State Office.',
      data: { batch: updatedBatch }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to reject batch.' }
    });
  }
};

/**
 * Get Delayed Batches requiring attention
 */
export const getDelayedBatches = async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000);

    const batches = await prisma.batch.findMany({
      where: {
        status: {
          in: [
            BATCH_STATUS.SUBMITTED,
            BATCH_STATUS.DISTRICT_REVIEW,
            BATCH_STATUS.QUALITY_REVIEW,
            BATCH_STATUS.STATE_REVIEW
          ]
        },
        lastActionAt: { lt: cutoff }
      },
      include: {
        trainingCentre: true,
        district: true
      },
      orderBy: { lastActionAt: 'asc' }
    });

    const enriched = batches.map(b => ({
      ...b,
      delayedHours: Math.round((Date.now() - new Date(b.lastActionAt).getTime()) / (3600 * 1000))
    }));

    return res.json({
      success: true,
      data: { batches: enriched }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve delayed batches.' }
    });
  }
};
