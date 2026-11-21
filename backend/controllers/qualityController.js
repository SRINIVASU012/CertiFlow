import prisma from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';
import { AUDIT_ACTIONS, BATCH_STATUS, REVIEW_DECISION } from '../config/constants.js';
import { emitEvent } from '../events/socket.js';
import logger from '../utils/logger.js';

/**
 * Get batches requiring Quality Review (large batches >= threshold)
 */
export const getPendingQualityBatches = async (req, res) => {
  try {
    const batches = await prisma.batch.findMany({
      where: {
        status: BATCH_STATUS.QUALITY_REVIEW
      },
      include: {
        trainingCentre: true,
        district: true,
        districtApprovals: {
          include: {
            officer: { select: { id: true, name: true, email: true } }
          }
        },
        qualityReviews: {
          include: {
            reviewer: { select: { id: true, name: true, email: true } }
          }
        }
      },
      orderBy: { submittedAt: 'asc' }
    });

    return res.json({
      success: true,
      data: { batches }
    });
  } catch (error) {
    logger.error('Error fetching quality review batches:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve quality review batches.' }
    });
  }
};

/**
 * Approve quality review for a large batch
 */
export const approveQualityReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const batch = await prisma.batch.findUnique({ where: { id } });
    if (!batch) {
      return res.status(404).json({ success: false, error: { message: 'Batch not found.' } });
    }

    if (batch.status !== BATCH_STATUS.QUALITY_REVIEW) {
      return res.status(400).json({
        success: false,
        error: { message: `Batch is in '${batch.status}' status, not QUALITY_REVIEW.` }
      });
    }

    const updatedBatch = await prisma.$transaction(async (tx) => {
      await tx.qualityReview.create({
        data: {
          batchId: batch.id,
          submissionCycle: batch.submissionCycle,
          reviewerId: req.user.id,
          decision: REVIEW_DECISION.APPROVED,
          reason: reason || 'Comprehensive quality inspection completed: trainer ratios and attendance verified.'
        }
      });

      const updated = await tx.batch.update({
        where: { id: batch.id },
        data: {
          status: BATCH_STATUS.STATE_REVIEW,
          lastActionAt: new Date()
        }
      });

      await logAudit({
        userId: req.user.id,
        userRole: req.user.role,
        action: AUDIT_ACTIONS.QUALITY_APPROVED,
        entityType: 'BATCH',
        entityId: batch.id,
        previousStatus: BATCH_STATUS.QUALITY_REVIEW,
        newStatus: BATCH_STATUS.STATE_REVIEW,
        reason: reason || 'Quality review approved',
        tx
      });

      return updated;
    });

    emitEvent(`batch:${id}`, 'quality_approved', { batchId: id });
    emitEvent('role:STATE_OFFICE', 'batch_ready_for_state_review', { batchId: id });

    return res.json({
      success: true,
      message: 'Quality review approved. Batch forwarded to State Office for final approval.',
      data: { batch: updatedBatch }
    });
  } catch (error) {
    logger.error('Error in quality review approval:', error);
    return res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to approve quality review.' }
    });
  }
};

/**
 * Reject quality review (Reason mandatory)
 */
export const rejectQualityReview = async (req, res) => {
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

    const updatedBatch = await prisma.$transaction(async (tx) => {
      await tx.qualityReview.create({
        data: {
          batchId: batch.id,
          submissionCycle: batch.submissionCycle,
          reviewerId: req.user.id,
          decision: REVIEW_DECISION.REJECTED,
          reason
        }
      });

      const updated = await tx.batch.update({
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
        action: AUDIT_ACTIONS.QUALITY_REJECTED,
        entityType: 'BATCH',
        entityId: batch.id,
        previousStatus: BATCH_STATUS.QUALITY_REVIEW,
        newStatus: BATCH_STATUS.REJECTED,
        reason,
        tx
      });

      return updated;
    });

    emitEvent(`batch:${id}`, 'batch_rejected', { batchId: id, reason });

    return res.json({
      success: true,
      message: 'Batch rejected by Quality Review team.',
      data: { batch: updatedBatch }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to reject quality review.' }
    });
  }
};

/**
 * Return batch from Quality Review for corrections (Reason mandatory)
 */
export const returnQualityReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Return reason is mandatory.' }
      });
    }

    const batch = await prisma.batch.findUnique({ where: { id } });
    if (!batch) {
      return res.status(404).json({ success: false, error: { message: 'Batch not found.' } });
    }

    const updatedBatch = await prisma.$transaction(async (tx) => {
      await tx.qualityReview.create({
        data: {
          batchId: batch.id,
          submissionCycle: batch.submissionCycle,
          reviewerId: req.user.id,
          decision: REVIEW_DECISION.RETURNED,
          reason
        }
      });

      const updated = await tx.batch.update({
        where: { id: batch.id },
        data: {
          status: BATCH_STATUS.RETURNED,
          returnReason: reason,
          lastActionAt: new Date()
        }
      });

      await logAudit({
        userId: req.user.id,
        userRole: req.user.role,
        action: AUDIT_ACTIONS.QUALITY_RETURNED,
        entityType: 'BATCH',
        entityId: batch.id,
        previousStatus: BATCH_STATUS.QUALITY_REVIEW,
        newStatus: BATCH_STATUS.RETURNED,
        reason,
        tx
      });

      return updated;
    });

    emitEvent(`batch:${id}`, 'batch_returned', { batchId: id, reason });

    return res.json({
      success: true,
      message: 'Batch returned to training centre by Quality Review team.',
      data: { batch: updatedBatch }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to return batch.' }
    });
  }
};
