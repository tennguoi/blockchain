import express from 'express';
import { requireAuth, requireSuperAdmin } from '../middleware/authMiddleware.js';
import * as superAdminController from '../controllers/superAdminController.js';
import { authRateLimiter } from '../middleware/securityMiddleware.js';

const router = express.Router();

// Route Công khai: Đăng ký trường/học viện mới
router.post('/institutions', authRateLimiter, superAdminController.registerInstitutionRequest);

// Các route yêu cầu quyền Super Admin
router.use(requireAuth, requireSuperAdmin);

router.get('/dashboard', superAdminController.getSuperAdminDashboard);
router.get('/pending', superAdminController.getPendingInstitutions);
router.get('/institutions', superAdminController.getInstitutions);
router.post('/approve/:id', superAdminController.approveInstitution);
router.post('/suspend/:id', superAdminController.suspendInstitution);
router.post('/activate/:id', superAdminController.activateInstitution);

export default router;
