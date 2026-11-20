import express from 'express';
import { scanFile, getMaskedPreview, getOriginalPreview } from '../controllers/scanController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.post('/:id', scanFile);
router.get('/:id/masked', getMaskedPreview);
router.get('/:id/original', getOriginalPreview);

export default router;
