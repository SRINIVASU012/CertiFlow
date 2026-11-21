import { Router } from 'express';
import {
  getPendingBatches,
  approveBatch,
  rejectBatch,
  returnBatch
} from '../controllers/districtController.js';
import { authenticateToken, requireDistrictOfficer } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken, requireDistrictOfficer);

router.get('/pending', getPendingBatches);
router.post('/batches/:id/approve', approveBatch);
router.post('/batches/:id/reject', rejectBatch);
router.post('/batches/:id/return', returnBatch);

export default router;
