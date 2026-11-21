import { Router } from 'express';
import {
  getStateDashboardMetrics,
  approveBatchFinal,
  rejectBatchFinal,
  getDelayedBatches
} from '../controllers/stateController.js';
import { getBatches } from '../controllers/batchController.js';
import { authenticateToken, requireStateOffice } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken, requireStateOffice);

router.get('/dashboard', getStateDashboardMetrics);
router.get('/batches', getBatches);
router.get('/delayed', getDelayedBatches);
router.post('/batches/:id/approve', approveBatchFinal);
router.post('/batches/:id/reject', rejectBatchFinal);

export default router;
