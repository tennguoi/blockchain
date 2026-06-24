import express from 'express';
import {
  getLinkWalletNonce,
  getMetamaskLoginNonce,
  login,
  registerAdmin,
  registerStudent,
  linkWallet,
  unlinkWallet,
  loginMetamask,
} from '../controllers/authController.js';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';
import { authRateLimiter } from '../middleware/securityMiddleware.js';

const router = express.Router();

router.post('/login', authRateLimiter, login);
router.post('/login-metamask/nonce', authRateLimiter, getMetamaskLoginNonce);
router.post('/login-metamask', authRateLimiter, loginMetamask);
router.post('/link-wallet/nonce', requireAuth, getLinkWalletNonce);
router.post('/link-wallet', requireAuth, linkWallet);
router.post('/unlink-wallet', requireAuth, unlinkWallet);

// Admin routes
router.post('/register-admin', requireAuth, requireAdmin, registerAdmin);
router.post('/register-student', requireAuth, requireAdmin, registerStudent);

export default router;
