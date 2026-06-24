import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';
import * as adminController from '../controllers/adminController.js';
import * as certificateController from '../controllers/certificateController.js';

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/students', adminController.getStudents);
router.get('/certificates', adminController.getCertificates);
router.get('/certificates/failed', adminController.getFailedCertificates);
router.get('/certificates/:id', adminController.getCertificateDetail);
router.post('/certificates/:id/reconcile', adminController.reconcileCertificate);

router.get('/audit-logs', adminController.getAuditLogs);
router.get('/verification-logs', adminController.getVerificationLogs);
router.get('/dashboard', adminController.getDashboard);

export default router;
