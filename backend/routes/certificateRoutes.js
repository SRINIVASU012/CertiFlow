import { Router } from 'express';
import {
  getCertificates,
  downloadCertificate,
  cancelCertificate
} from '../controllers/certificateController.js';
import { authenticateToken, requireStateOffice } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getCertificates);
router.get('/:id/download', downloadCertificate);
router.post('/:id/cancel', requireStateOffice, cancelCertificate);

export default router;
