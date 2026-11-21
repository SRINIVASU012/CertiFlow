import multer from 'multer';
import prisma from '../config/db.js';
import { parseAndValidateSpreadsheet } from '../services/spreadsheetService.js';
import { logAudit } from '../utils/auditLogger.js';
import { AUDIT_ACTIONS, BATCH_STATUS, ROLES } from '../config/constants.js';
import { emitEvent } from '../events/socket.js';
import logger from '../utils/logger.js';

// Multer memory storage configuration with 10MB limit and Excel filter
const storage = multer.memoryStorage();
export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream'
    ];
    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel spreadsheet files (.xlsx, .xls) are allowed.'));
    }
  }
}).single('file');

/**
 * Create a new batch in DRAFT status
 */
export const createBatch = async (req, res) => {
  try {
    const { batchName, courseName, districtId, trainingCentreId } = req.body;

    if (!batchName || !courseName) {
      return res.status(400).json({
        success: false,
        error: { message: 'Batch name and course name are required.' }
      });
    }

    // Determine Training Centre ID & District ID from authenticated user if not supplied
    const tcId = req.user.trainingCentreId || trainingCentreId;
    const distId = req.user.districtId || districtId;

    if (!tcId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Training Centre must be specified.' }
      });
    }

    // Generate readable unique batch number e.g. BATCH-2026-008
    const currentYear = new Date().getFullYear();
    const count = await prisma.batch.count();
    const batchNumber = `BATCH-${currentYear}-${String(count + 1).padStart(3, '0')}`;

    const trainingCentre = await prisma.trainingCentre.findUnique({
      where: { id: tcId },
      include: { district: true }
    });

    if (!trainingCentre) {
      return res.status(404).json({
        success: false,
        error: { message: 'Specified Training Centre not found.' }
      });
    }

    const batch = await prisma.batch.create({
      data: {
        batchNumber,
        batchName,
        courseName,
        trainingCentreId: tcId,
        districtId: distId || trainingCentre.districtId,
        status: BATCH_STATUS.DRAFT,
        candidateCount: 0
      },
      include: {
        trainingCentre: true,
        district: true
      }
    });

    await logAudit({
      userId: req.user.id,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.BATCH_CREATED,
      entityType: 'BATCH',
      entityId: batch.id,
      newStatus: BATCH_STATUS.DRAFT,
      metadata: { batchNumber, batchName, courseName }
    });

    emitEvent('role:TRAINING_CENTRE', 'batch_created', { batchId: batch.id });

    return res.status(201).json({
      success: true,
      data: { batch }
    });
  } catch (error) {
    logger.error('Error creating batch:', error);
    return res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to create batch.' }
    });
  }
};

/**
 * Get all batches accessible to the current user
 */
export const getBatches = async (req, res) => {
  try {
    const { status, districtId, trainingCentreId, search } = req.query;
    const where = {};

    // Role-based data scoping
    if (req.user.role === ROLES.TRAINING_CENTRE && req.user.trainingCentreId) {
      where.trainingCentreId = req.user.trainingCentreId;
    } else if (req.user.role === ROLES.DISTRICT_OFFICER && req.user.districtId) {
      where.districtId = req.user.districtId;
    }

    if (status) {
      where.status = status;
    }
    if (districtId) {
      where.districtId = districtId;
    }
    if (trainingCentreId) {
      where.trainingCentreId = trainingCentreId;
    }
    if (search) {
      where.OR = [
        { batchNumber: { contains: search, mode: 'insensitive' } },
        { batchName: { contains: search, mode: 'insensitive' } },
        { courseName: { contains: search, mode: 'insensitive' } }
      ];
    }

    const batches = await prisma.batch.findMany({
      where,
      include: {
        trainingCentre: { select: { id: true, code: true, name: true } },
        district: { select: { id: true, code: true, name: true } },
        districtApprovals: {
          include: { officer: { select: { id: true, name: true, email: true } } }
        },
        qualityReviews: {
          include: { reviewer: { select: { id: true, name: true, email: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      success: true,
      data: { batches }
    });
  } catch (error) {
    logger.error('Error fetching batches:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve batches.' }
    });
  }
};

/**
 * Get single batch by ID with full details
 */
export const getBatchById = async (req, res) => {
  try {
    const { id } = req.params;

    const batch = await prisma.batch.findUnique({
      where: { id },
      include: {
        trainingCentre: true,
        district: true,
        candidates: {
          orderBy: { candidateIdentifier: 'asc' },
          include: {
            certificate: true,
            notifications: true
          }
        },
        districtApprovals: {
          include: {
            officer: { select: { id: true, name: true, email: true, role: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        qualityReviews: {
          include: {
            reviewer: { select: { id: true, name: true, email: true, role: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        certificates: true
      }
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: { message: 'Batch not found.' }
      });
    }

    // Security check: Training centre users can only view their own batches
    if (req.user.role === ROLES.TRAINING_CENTRE && batch.trainingCentreId !== req.user.trainingCentreId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied. You can only view batches from your own training centre.' }
      });
    }

    // Fetch related audit logs for this batch
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'BATCH',
        entityId: batch.id
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } }
      },
      orderBy: { timestamp: 'desc' }
    });

    return res.json({
      success: true,
      data: {
        batch,
        auditLogs
      }
    });
  } catch (error) {
    logger.error('Error fetching batch by ID:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve batch details.' }
    });
  }
};

/**
 * Upload candidates spreadsheet and perform atomic import
 */
export const uploadCandidates = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'No spreadsheet file uploaded. Please select an Excel file (.xlsx, .xls).' }
      });
    }

    const batch = await prisma.batch.findUnique({
      where: { id }
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: { message: 'Batch not found.' }
      });
    }

    // Only DRAFT or RETURNED batches can have candidates uploaded/modified
    if (![BATCH_STATUS.DRAFT, BATCH_STATUS.RETURNED].includes(batch.status)) {
      return res.status(400).json({
        success: false,
        error: { message: `Candidates cannot be uploaded to a batch in '${batch.status}' status.` }
      });
    }

    // Verify ownership
    if (req.user.role === ROLES.TRAINING_CENTRE && batch.trainingCentreId !== req.user.trainingCentreId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied. You can only upload candidates to your own centre batches.' }
      });
    }

    // Parse and strictly validate the spreadsheet
    const validationResult = await parseAndValidateSpreadsheet(req.file.buffer);

    if (!validationResult.isValid) {
      return res.status(422).json({
        success: false,
        error: {
          message: 'Spreadsheet validation failed. No candidates were imported.',
          errorsCount: validationResult.errors.length,
          errors: validationResult.errors
        }
      });
    }

    // Atomic Database Transaction:
    // Delete any existing candidates for this batch, then insert new ones
    const importedCandidates = await prisma.$transaction(async (tx) => {
      // 1. Delete prior candidates for this batch if re-uploading
      await tx.candidate.deleteMany({
        where: { batchId: batch.id }
      });

      // 2. Prepare candidate data with batch ID
      const candidateRecords = validationResult.candidates.map((c) => ({
        batchId: batch.id,
        candidateIdentifier: c.candidateIdentifier,
        name: c.name,
        email: c.email,
        mobileNumber: c.mobileNumber,
        courseName: c.courseName || batch.courseName,
        completionDate: c.completionDate
      }));

      // 3. Insert all candidates
      await tx.candidate.createMany({
        data: candidateRecords
      });

      // 4. Update batch candidate count
      const updatedBatch = await tx.batch.update({
        where: { id: batch.id },
        data: {
          candidateCount: candidateRecords.length,
          lastActionAt: new Date()
        }
      });

      // 5. Audit log
      await logAudit({
        userId: req.user.id,
        userRole: req.user.role,
        action: AUDIT_ACTIONS.CANDIDATES_UPLOADED,
        entityType: 'BATCH',
        entityId: batch.id,
        metadata: {
          candidateCount: candidateRecords.length,
          fileName: req.file.originalname
        },
        tx
      });

      return updatedBatch;
    });

    emitEvent(`batch:${batch.id}`, 'candidates_updated', {
      batchId: batch.id,
      candidateCount: validationResult.candidates.length
    });

    return res.json({
      success: true,
      message: `Successfully imported ${validationResult.candidates.length} candidates.`,
      data: {
        candidateCount: validationResult.candidates.length,
        batch: importedCandidates
      }
    });
  } catch (error) {
    logger.error('Error uploading candidates:', error);
    return res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to upload and import candidates.' }
    });
  }
};

/**
 * Submit a DRAFT batch for District Officer Review
 */
export const submitBatch = async (req, res) => {
  try {
    const { id } = req.params;

    const batch = await prisma.batch.findUnique({
      where: { id },
      include: { candidates: true }
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: { message: 'Batch not found.' }
      });
    }

    if (batch.status !== BATCH_STATUS.DRAFT) {
      return res.status(400).json({
        success: false,
        error: { message: `Only DRAFT batches can be submitted. Current status: ${batch.status}` }
      });
    }

    if (batch.candidates.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot submit an empty batch. Please upload candidates first.' }
      });
    }

    const updatedBatch = await prisma.batch.update({
      where: { id: batch.id },
      data: {
        status: BATCH_STATUS.DISTRICT_REVIEW,
        submittedAt: new Date(),
        lastActionAt: new Date()
      }
    });

    await logAudit({
      userId: req.user.id,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.BATCH_SUBMITTED,
      entityType: 'BATCH',
      entityId: batch.id,
      previousStatus: BATCH_STATUS.DRAFT,
      newStatus: BATCH_STATUS.DISTRICT_REVIEW,
      metadata: { candidateCount: batch.candidates.length }
    });

    emitEvent('role:DISTRICT_OFFICER', 'batch_submitted', {
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      districtId: batch.districtId
    });

    return res.json({
      success: true,
      message: 'Batch successfully submitted for District Officer review.',
      data: { batch: updatedBatch }
    });
  } catch (error) {
    logger.error('Error submitting batch:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to submit batch.' }
    });
  }
};

/**
 * Resubmit a RETURNED batch after corrections.
 * Increments submissionCycle to reset the approval counting for the new cycle!
 */
export const resubmitBatch = async (req, res) => {
  try {
    const { id } = req.params;

    const batch = await prisma.batch.findUnique({
      where: { id },
      include: { candidates: true }
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: { message: 'Batch not found.' }
      });
    }

    if (batch.status !== BATCH_STATUS.RETURNED) {
      return res.status(400).json({
        success: false,
        error: { message: `Only RETURNED batches can be resubmitted. Current status: ${batch.status}` }
      });
    }

    if (batch.candidates.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot resubmit an empty batch. Candidates must be present.' }
      });
    }

    const newCycle = batch.submissionCycle + 1;

    const updatedBatch = await prisma.batch.update({
      where: { id: batch.id },
      data: {
        status: BATCH_STATUS.DISTRICT_REVIEW,
        submissionCycle: newCycle,
        returnReason: null,
        submittedAt: new Date(),
        lastActionAt: new Date()
      }
    });

    await logAudit({
      userId: req.user.id,
      userRole: req.user.role,
      action: AUDIT_ACTIONS.BATCH_RESUBMITTED,
      entityType: 'BATCH',
      entityId: batch.id,
      previousStatus: BATCH_STATUS.RETURNED,
      newStatus: BATCH_STATUS.DISTRICT_REVIEW,
      metadata: {
        submissionCycle: newCycle,
        previousCycle: batch.submissionCycle,
        candidateCount: batch.candidates.length
      }
    });

    emitEvent('role:DISTRICT_OFFICER', 'batch_resubmitted', {
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      submissionCycle: newCycle
    });

    return res.json({
      success: true,
      message: `Batch resubmitted successfully for Cycle ${newCycle}. Prior approvals remain preserved in audit history.`,
      data: { batch: updatedBatch }
    });
  } catch (error) {
    logger.error('Error resubmitting batch:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to resubmit batch.' }
    });
  }
};

/**
 * Get districts and training centres for UI dropdowns
 */
export const getMetadata = async (req, res) => {
  try {
    const districts = await prisma.district.findMany({ orderBy: { name: 'asc' } });
    const trainingCentres = await prisma.trainingCentre.findMany({ orderBy: { name: 'asc' } });

    return res.json({
      success: true,
      data: { districts, trainingCentres }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve metadata.' }
    });
  }
};
