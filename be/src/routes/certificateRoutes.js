import express from 'express';
import { uploadCertificateFile } from '../config/upload.js';
import {
  requireAuth,
  requireAdmin,
  requireSelfStudentOrAdmin,
} from '../middleware/authMiddleware.js';
import { verifyRateLimiter } from '../middleware/securityMiddleware.js';
import * as certificateController from '../controllers/certificateController.js';

const router = express.Router();

// Routes Public (Không cần đăng nhập)
router.get('/verify/:id', verifyRateLimiter, certificateController.verifyCertificate);

// Routes Student
router.get(
  '/student/:studentId',
  requireAuth,
  requireSelfStudentOrAdmin,
  certificateController.getStudentCertificates
);

// Routes Admin
router.post(
  '/issue',
  requireAuth,
  requireAdmin,
  uploadCertificateFile.single('file'),
  certificateController.issueCertificate
);
router.post('/revoke/:id', requireAuth, requireAdmin, certificateController.revokeCertificate);
router.get('/stats', requireAuth, requireAdmin, certificateController.getDashboardStats);

export default router;
