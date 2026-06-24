import multer from 'multer';

const getClientMessage = (error, statusCode) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return 'File văn bằng vượt quá giới hạn dung lượng cho phép';
    }

    return 'File upload không hợp lệ';
  }

  if (statusCode < 500) {
    return error.message || 'Yêu cầu không hợp lệ';
  }

  return 'Lỗi server';
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({ error: 'Không tìm thấy API' });
};

export const errorHandler = (error, req, res, next) => {
  const statusCode =
    error.statusCode ||
    error.status ||
    (error instanceof multer.MulterError ? 400 : 500);

  console.error(`[ERROR] ${req.method} ${req.originalUrl}`, {
    message: error.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
  });

  res.status(statusCode).json({
    error: getClientMessage(error, statusCode),
  });
};
