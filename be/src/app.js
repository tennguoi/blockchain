import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/authRoutes.js';
import certificateRoutes from './routes/certificateRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug: log tất cả request đến server
app.use((req, res, next) => {
  console.log(`\n[DEBUG SERVER] ${req.method} ${req.originalUrl}`);
  console.log(`[DEBUG SERVER] Body:`, JSON.stringify(req.body, null, 2));
  next();
});

// Serve static uploads if any local storage used for temp files
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});



// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

export default app;
