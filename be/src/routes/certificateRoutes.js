import express from 'express';
import multer from 'multer';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';
import * as certificateController from '../controllers/certificateController.js';

const router = express.Router();

// Cấu hình Multer để upload file local tạm thời
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Routes Public (Không cần đăng nhập)
router.get('/verify/:id', certificateController.verifyCertificate);

// Routes Student
router.get('/student/:studentId', requireAuth, certificateController.getStudentCertificates);

// Routes Admin
router.post('/issue', requireAuth, requireAdmin, upload.single('file'), certificateController.issueCertificate);
router.post('/revoke/:id', requireAuth, requireAdmin, certificateController.revokeCertificate);
router.get('/stats', requireAuth, requireAdmin, certificateController.getDashboardStats);

export default router;
