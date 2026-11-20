import express from 'express';
import { scanFile, getMaskedPreview } from '../controllers/scanController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.post('/:file_id', scanFile);
router.get('/:file_id/preview', getMaskedPreview);

export default router;
