import prisma from '../config/db.js';
import { logAudit } from '../utils/auditLogger.js';
import { AUDIT_ACTIONS, BATCH_STATUS, DEFAULT_QUALITY_THRESHOLD, REVIEW_DECISION } from '../config/constants.js';
import { emitEvent } from '../events/socket.js';
import logger from '../utils/logger.js';

/**
 * Get pending batches waiting for District Officer review
 */
export const getPendingBatches = async (req, res) => {
  try {
    const where = {
      status: { in: [BATCH_STATUS.DISTRICT_REVIEW, BATCH_STATUS.SUBMITTED] }
    };

    // Filter by officer's assigned district if present
    if (req.user.districtId) {
      where.districtId = req.user.districtId;
    }

    const batches = await prisma.batch.findMany({
      where,
      include: {
        trainingCentre: true,
        district: true,
        districtApprovals: {
          include: {
            officer: { select: { id: true, name: true, email: true } }
          }
        }
      },
      orderBy: { submittedAt: 'asc' }
    });

    // Annotate whether current officer has already approved the current submission cycle
    const annotatedBatches = batches.map((batch) => {
      const currentCycleApprovals = batch.districtApprovals.filter(
        (a) => a.submissionCycle === batch.submissionCycle && a.decision === REVIEW_DECISION.APPROVED
      );
      const alreadyApprovedByMe = currentCycleApprovals.some((a) => a.officerId === req.user.id);

      return {
        ...batch,
        currentApprovalsCount: currentCycleApprovals.length,
        alreadyApprovedByMe
      };
    });

    return res.json({
      success: true,
      data: { batches: annotatedBatches }
    });
  } catch (error) {
    logger.error('Error fetching pending district batches:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve pending district batches.' }
    });
  }
};

/**
 * Approve a batch by a District Officer.
 * Requires TWO DIFFERENT district officers before advancing to Quality Review or State Review.
 * Protected against race conditions using Prisma database transaction.
 */
export const approveBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const officerId = req.user.id;

    const threshold = parseInt(process.env.QUALITY_REVIEW_THRESHOLD || String(DEFAULT_QUALITY_THRESHOLD), 10);

    // Execute approval inside an atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current batch state with write lock / fresh state
      const batch = await tx.batch.findUnique({
        where: { id },
        include: {
          districtApprovals: true
        }
      });

      if (!batch) {
        throw { statusCode: 404, message: 'Batch not found.' };
      }

      if (![BATCH_STATUS.DISTRICT_REVIEW, BATCH_STATUS.SUBMITTED].includes(batch.status)) {
        throw {
          statusCode: 400,
          message: `Batch cannot be approved in '${batch.status}' status. It must be in DISTRICT_REVIEW.`
        };
      }

      // 2. Check if THIS officer already approved during THIS submission cycle
      const existingApproval = batch.districtApprovals.find(
        (a) => a.officerId === officerId && a.submissionCycle === batch.submissionCycle && a.decision === REVIEW_DECISION.APPROVED
      );

      if (existingApproval) {
        throw {
          statusCode: 400,
          message: 'You have already approved this batch for the current submission cycle. Two different officers are required.'
        };
      }

      // 3. Create the DistrictApproval record
      await tx.districtApproval.create({
        data: {
          batchId: batch.id,
          submissionCycle: batch.submissionCycle,
          officerId,
          decision: REVIEW_DECISION.APPROVED,
          reason: reason || 'Verified candidate attendance, training centre logbooks, and curriculum completion.'
        }
      });

      // 4. Count total distinct officer approvals in the current submission cycle
      const approvalsCount = await tx.districtApproval.count({
        where: {
          batchId: batch.id,
          submissionCycle: batch.submissionCycle,
          decision: REVIEW_DECISION.APPROVED
        }
      });

      let nextStatus = batch.status;
      let advanced = false;

      // 5. If 2 distinct officers have approved, advance to Quality Review (if >= threshold) or State Review
      if (approvalsCount >= 2) {
        advanced = true;
        if (batch.candidateCount >= threshold) {
          nextStatus = BATCH_STATUS.QUALITY_REVIEW;
        } else {
          nextStatus = BATCH_STATUS.STATE_REVIEW;
        }
      }

      // 6. Update batch status
      const updatedBatch = await tx.batch.update({
        where: { id: batch.id },
        data: {
          status: nextStatus,
          lastActionAt: new Date()
        }
      });

      // 7. Record immutable audit log
      await logAudit({
        userId: req.user.id,
        userRole: req.user.role,
        action: AUDIT_ACTIONS.DISTRICT_APPROVED,
        entityType: 'BATCH',
        entityId: batch.id,
        previousStatus: batch.status,
        newStatus: nextStatus,
        reason: reason || 'District officer approval provided',
        metadata: {
          approvalsCount,
          advanced,
          nextStatus,
          submissionCycle: batch.submissionCycle
        },
        tx
      });

      return {
        batch: updatedBatch,
        approvalsCount,
        advanced,
        nextStatus
      };
    });

    // Emit real-time events based on workflow progression
    emitEvent(`batch:${id}`, 'batch_approved', {
      batchId: id,
      approvalsCount: result.approvalsCount,
      nextStatus: result.nextStatus
    });

    if (result.advanced) {
      if (result.nextStatus === BATCH_STATUS.QUALITY_REVIEW) {
        emitEvent('role:QUALITY_TEAM', 'batch_requires_quality_review', { batchId: id });
      } else {
        emitEvent('role:STATE_OFFICE', 'batch_ready_for_state_review', { batchId: id });
      }
    }

    return res.json({
      success: true,
      message: result.advanced
        ? `Second district approval recorded. Batch advanced to ${result.nextStatus}.`
        : 'First district approval recorded. Awaiting second officer approval.',
      data: result
    });
  } catch (error) {
    logger.error('Error approving batch at district level:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: { message: error.message || 'Failed to record district approval.' }
    });
  }
};

/**
 * Reject a batch by a District Officer (Reason mandatory)
 */
export const rejectBatch = async (req, res) => {
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
      await tx.districtApproval.create({
        data: {
          batchId: batch.id,
          submissionCycle: batch.submissionCycle,
          officerId: req.user.id,
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
        action: AUDIT_ACTIONS.DISTRICT_REJECTED,
        entityType: 'BATCH',
        entityId: batch.id,
        previousStatus: batch.status,
        newStatus: BATCH_STATUS.REJECTED,
        reason,
        tx
      });

      return updated;
    });

    emitEvent(`batch:${id}`, 'batch_rejected', { batchId: id, reason });
    emitEvent('role:TRAINING_CENTRE', 'batch_rejected', { batchId: id, reason });

    return res.json({
      success: true,
      message: 'Batch rejected with recorded reason.',
      data: { batch: updatedBatch }
    });
  } catch (error) {
    logger.error('Error rejecting batch at district level:', error);
    return res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to reject batch.' }
    });
  }
};

/**
 * Return a batch for correction (Reason mandatory)
 */
export const returnBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Return reason is mandatory to guide the training centre.' }
      });
    }

    const batch = await prisma.batch.findUnique({ where: { id } });
    if (!batch) {
      return res.status(404).json({ success: false, error: { message: 'Batch not found.' } });
    }

    const updatedBatch = await prisma.$transaction(async (tx) => {
      await tx.districtApproval.create({
        data: {
          batchId: batch.id,
          submissionCycle: batch.submissionCycle,
          officerId: req.user.id,
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
        action: AUDIT_ACTIONS.BATCH_RETURNED,
        entityType: 'BATCH',
        entityId: batch.id,
        previousStatus: batch.status,
        newStatus: BATCH_STATUS.RETURNED,
        reason,
        tx
      });

      return updated;
    });

    emitEvent(`batch:${id}`, 'batch_returned', { batchId: id, reason });
    emitEvent('role:TRAINING_CENTRE', 'batch_returned', { batchId: id, reason });

    return res.json({
      success: true,
      message: 'Batch returned to training centre for corrections.',
      data: { batch: updatedBatch }
    });
  } catch (error) {
    logger.error('Error returning batch at district level:', error);
    return res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to return batch.' }
    });
  }
};
