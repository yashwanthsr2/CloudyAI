import express from 'express';
import { getAnalyticsSummary } from '../controllers/analyticsController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/summary', getAnalyticsSummary);
router.get('/', getAnalyticsSummary);

export default router;
