import fs from 'fs';
import prisma from '../config/db.js';
import storageService from '../services/storageService.js';
import { CERTIFICATE_STATUS } from '../config/constants.js';
import logger from '../utils/logger.js';

/**
 * Public Certificate Verification
 * 
 * Open to public, employers, and candidates without login.
 * 
 * Guarantees:
 * 1. Checks current PostgreSQL state on EVERY lookup (no stale cache)
 * 2. Privacy: NEVER exposes candidate email, mobile number, or private identifiers
 * 3. Shows VALID, CANCELLED, or NOT_FOUND clearly
 */
export const verifyCertificate = async (req, res) => {
  try {
    const { certificateNumber } = req.params;

    if (!certificateNumber) {
      return res.status(400).json({
        success: false,
        error: { message: 'Certificate number is required for verification.' }
      });
    }

    const cleanCertNumber = certificateNumber.trim().toUpperCase();

    // Direct, uncached lookup from database
    const certificate = await prisma.certificate.findUnique({
      where: { certificateNumber: cleanCertNumber },
      include: {
        candidate: {
          select: {
            name: true,
            courseName: true,
            completionDate: true
          }
        },
        batch: {
          select: {
            batchNumber: true,
            trainingCentre: {
              select: {
                name: true,
                code: true
              }
            },
            district: {
              select: {
                name: true,
                state: true
              }
            }
          }
        }
      }
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        verificationStatus: 'NOT_FOUND',
        message: 'No certificate found with this certificate number. Please check the number and try again.'
      });
    }

    // If CANCELLED
    if (certificate.status === CERTIFICATE_STATUS.CANCELLED) {
      return res.json({
        success: true,
        verificationStatus: 'CANCELLED',
        message: 'WARNING: This certificate was revoked/cancelled by the State Certification Authority.',
        data: {
          certificateNumber: certificate.certificateNumber,
          candidateName: certificate.candidate.name,
          courseName: certificate.candidate.courseName,
          trainingCentreName: certificate.batch.trainingCentre.name,
          issueDate: certificate.issueDate,
          cancelledAt: certificate.cancelledAt,
          cancellationReason: certificate.cancellationReason
        }
      });
    }

    // If VALID
    return res.json({
      success: true,
      verificationStatus: 'VALID',
      message: 'Official Pragati Skills Mission Certificate Verified Authenticated.',
      data: {
        certificateNumber: certificate.certificateNumber,
        candidateName: certificate.candidate.name,
        courseName: certificate.candidate.courseName,
        trainingCentreName: certificate.batch.trainingCentre.name,
        district: certificate.batch.district.name,
        state: certificate.batch.district.state,
        completionDate: certificate.candidate.completionDate,
        issueDate: certificate.issueDate
      }
    });
  } catch (error) {
    logger.error('Error during public verification lookup:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'An error occurred while verifying the certificate.' }
    });
  }
};

/**
 * Public PDF Download for candidates and employers
 * Only downloads if certificate is currently VALID
 */
export const downloadPublicCertificate = async (req, res) => {
  try {
    const { certificateNumber } = req.params;
    const cleanCertNumber = certificateNumber.trim().toUpperCase();

    const certificate = await prisma.certificate.findUnique({
      where: { certificateNumber: cleanCertNumber }
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        error: { message: 'Certificate not found.' }
      });
    }

    if (certificate.status !== CERTIFICATE_STATUS.VALID) {
      return res.status(403).json({
        success: false,
        error: { message: 'Cannot download a cancelled or invalid certificate.' }
      });
    }

    const filePath = storageService.getCertificatePath(certificate.pdfFileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: { message: 'Certificate file is not available on storage server.' }
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${certificate.pdfFileName}"`);
    const fileStream = fs.createReadStream(filePath);
    return fileStream.pipe(res);
  } catch (error) {
    logger.error('Error during public download:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to download certificate.' }
    });
  }
};
