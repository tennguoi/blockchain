import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.resolve(__dirname, '../../uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const MAX_CERTIFICATE_FILE_SIZE =
  Number(process.env.MAX_CERTIFICATE_FILE_SIZE_MB || 10) * 1024 * 1024;

const allowedMimeTypes = new Map([
  ['application/pdf', '.pdf'],
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
]);

const createUploadError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const mimeExtension = allowedMimeTypes.get(file.mimetype);
    const originalExtension = path.extname(file.originalname).toLowerCase();
    const extension = mimeExtension || originalExtension || '.bin';
    const randomName = crypto.randomBytes(16).toString('hex');
    cb(null, `${Date.now()}-${randomName}${extension}`);
  },
});

const fileFilter = (req, file, cb) => {
  const mimeExtension = allowedMimeTypes.get(file.mimetype);
  const originalExtension = path.extname(file.originalname).toLowerCase();

  if (!mimeExtension || !['.pdf', '.png', '.jpg', '.jpeg'].includes(originalExtension)) {
    return cb(
      createUploadError('File văn bằng chỉ được phép là PDF, PNG hoặc JPEG')
    );
  }

  return cb(null, true);
};

export const uploadCertificateFile = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_CERTIFICATE_FILE_SIZE,
    files: 1,
  },
});
