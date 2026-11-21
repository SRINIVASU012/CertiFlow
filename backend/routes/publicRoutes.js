import { Router } from 'express';
import {
  verifyCertificate,
  downloadPublicCertificate
} from '../controllers/publicController.js';

const router = Router();

// Public routes - No authentication required
router.get('/verify/:certificateNumber', verifyCertificate);
router.get('/certificates/:certificateNumber/download', downloadPublicCertificate);

export default router;
