import { Router } from 'express';
import {
  getPendingQualityBatches,
  approveQualityReview,
  rejectQualityReview,
  returnQualityReview
} from '../controllers/qualityController.js';
import { authenticateToken, requireQualityTeam } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken, requireQualityTeam);

router.get('/pending', getPendingQualityBatches);
router.post('/batches/:id/approve', approveQualityReview);
router.post('/batches/:id/reject', rejectQualityReview);
router.post('/batches/:id/return', returnQualityReview);

export default router;
