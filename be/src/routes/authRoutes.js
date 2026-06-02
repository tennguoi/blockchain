import express from 'express';
import { login, registerAdmin, registerStudent, linkWallet, unlinkWallet, loginMetamask } from '../controllers/authController.js';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', login);
router.post('/login-metamask', loginMetamask);
router.post('/link-wallet', requireAuth, linkWallet);
router.post('/unlink-wallet', requireAuth, unlinkWallet);

// Admin routes
router.post('/register-admin', registerAdmin); // In production, this should be protected
router.post('/register-student', requireAuth, requireAdmin, registerStudent);

export default router;
