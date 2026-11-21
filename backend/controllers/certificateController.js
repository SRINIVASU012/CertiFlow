import fs from 'fs';
import prisma from '../config/db.js';
import storageService from '../services/storageService.js';
import { logAudit } from '../utils/auditLogger.js';
import { AUDIT_ACTIONS, CERTIFICATE_STATUS, ROLES } from '../config/constants.js';
import { emitEvent } from '../events/socket.js';
import logger from '../utils/logger.js';

/**
 * List certificates with role-based scoping and filters
 */
export const getCertificates = async (req, res) => {
  try {
    const { status, search, batchId } = req.query;
    const where = {};

    if (status) {
      where.status = status;
    }
    if (batchId) {
      where.batchId = batchId;
    }

    // Role-based filtering
    if (req.user.role === ROLES.TRAINING_CENTRE && req.user.trainingCentreId) {
      where.batch = { trainingCentreId: req.user.trainingCentreId };
    } else if (req.user.role === ROLES.DISTRICT_OFFICER && req.user.districtId) {
      where.batch = { districtId: req.user.districtId };
    }

    if (search) {
      where.OR = [
        { certificateNumber: { contains: search, mode: 'insensitive' } },
        { candidate: { name: { contains: search, mode: 'insensitive' } } },
        { batch: { courseName: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const certificates = await prisma.certificate.findMany({
      where,
      include: {
        candidate: {
          select: {
            id: true,
            candidateIdentifier: true,
            name: true,
            email: true,
            mobileNumber: true,
            courseName: true,
            completionDate: true
          }
        },
        batch: {
          select: {
            id: true,
            batchNumber: true,
            batchName: true,
            trainingCentre: { select: { id: true, name: true, code: true } },
            district: { select: { id: true, name: true } }
          }
        },
        cancelledBy: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { issueDate: 'desc' }
    });

    return res.json({
      success: true,
      data: { certificates }
    });
  } catch (error) {
    logger.error('Error fetching certificates:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve certificates.' }
    });
  }
};

/**
 * Download Certificate PDF
 */
export const downloadCertificate = async (req, res) => {
  try {
    const { id } = req.params;

    const certificate = await prisma.certificate.findUnique({
      where: { id },
      include: {
        candidate: true,
        batch: true
      }
    });

    if (!certificate) {
      return res.status(404).json({ success: false, error: { message: 'Certificate not found.' } });
    }

    // Access control: TC can only access own centre's certificates
    if (req.user.role === ROLES.TRAINING_CENTRE && certificate.batch.trainingCentreId !== req.user.trainingCentreId) {
      return res.status(403).json({ success: false, error: { message: 'Access denied.' } });
    }

    const filePath = storageService.getCertificatePath(certificate.pdfFileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: { message: 'Certificate PDF file is missing on storage server.' }
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${certificate.pdfFileName}"`);
    const fileStream = fs.createReadStream(filePath);
    return fileStream.pipe(res);
  } catch (error) {
    logger.error('Error downloading certificate:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to download certificate.' }
    });
  }
};

/**
 * Cancel an issued Certificate (State Office only, Reason mandatory)
 */
export const cancelCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cancellation reason is mandatory for auditing.' }
      });
    }

    const certificate = await prisma.certificate.findUnique({
      where: { id },
      include: { candidate: true, batch: true }
    });

    if (!certificate) {
      return res.status(404).json({ success: false, error: { message: 'Certificate not found.' } });
    }

    if (certificate.status === CERTIFICATE_STATUS.CANCELLED) {
      return res.status(400).json({
        success: false,
        error: { message: 'This certificate has already been cancelled.' }
      });
    }

    const updatedCert = await prisma.certificate.update({
      where: { id: certificate.id },
      data: {
        status: CERTIFICATE_STATUS.CANCELLED,
        cancelledAt: new Date(),
        cancelledById: req.user.id,
        cancellationReason: reason
      }
    });

    // Record audit log
    await logAudit({
      userId: req.user.id,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.CERTIFICATE_CANCELLED,
      entityType: 'CERTIFICATE',
      entityId: certificate.id,
      previousStatus: CERTIFICATE_STATUS.VALID,
      newStatus: CERTIFICATE_STATUS.CANCELLED,
      reason,
      metadata: {
        certificateNumber: certificate.certificateNumber,
        candidateName: certificate.candidate.name,
        candidateId: certificate.candidate.id
      }
    });

    // Real-time notification of cancellation
    emitEvent(null, 'certificate_cancelled', {
      certificateId: certificate.id,
      certificateNumber: certificate.certificateNumber,
      reason
    });

    return res.json({
      success: true,
      message: `Certificate ${certificate.certificateNumber} has been officially CANCELLED. Public verification will immediately reflect this change.`,
      data: { certificate: updatedCert }
    });
  } catch (error) {
    logger.error('Error cancelling certificate:', error);
    return res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to cancel certificate.' }
    });
  }
};
