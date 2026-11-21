import { Router } from 'express';
import {
  createBatch,
  getBatches,
  getBatchById,
  uploadCandidates,
  submitBatch,
  resubmitBatch,
  getMetadata,
  uploadMiddleware
} from '../controllers/batchController.js';
import { authenticateToken, requireTrainingCentre } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/metadata', getMetadata);
router.get('/', getBatches);
router.post('/', requireTrainingCentre, createBatch);
router.get('/:id', getBatchById);
router.post('/:id/upload', requireTrainingCentre, uploadMiddleware, uploadCandidates);
router.post('/:id/submit', requireTrainingCentre, submitBatch);
router.post('/:id/resubmit', requireTrainingCentre, resubmitBatch);

export default router;
