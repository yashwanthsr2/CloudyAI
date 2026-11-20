import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import fileRoutes from './routes/fileRoutes.js';
import scanRoutes from './routes/scanRoutes.js';
import shareRoutes from './routes/shareRoutes.js';
import transferRoutes from './routes/transferRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import { uploadFile } from './controllers/fileController.js';
import { upload } from './middleware/uploadMiddleware.js';
import { requireAuth } from './middleware/authMiddleware.js';

dotenv.config();

const app = express();

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: false // Allow masked preview images to load across origins
}));

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-demo-user-id']
}));

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.' }
});

app.use('/api/', generalLimiter);

app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'AI CLOUD DRIVE — Privacy-Aware Cloud Storage',
    timestamp: new Date().toISOString()
  });
});

// Direct alias for POST /api/upload as per Section 9 API contract
app.post('/api/upload', requireAuth, upload.single('file'), uploadFile);

// API Routes
app.use('/api/files', fileRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/shares', shareRoutes);
app.use('/api/transfer', transferRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Endpoint ${req.originalUrl} not found.` });
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal server error',
    code: err.code
  });
});

export default app;
