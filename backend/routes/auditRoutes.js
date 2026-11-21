import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditController.js';
import { authenticateToken, requireStateOffice } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken, requireStateOffice);

router.get('/', getAuditLogs);

export default router;
