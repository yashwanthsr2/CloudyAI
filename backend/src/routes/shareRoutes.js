import express from 'express';
import { createShare, listShares } from '../controllers/shareController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.post('/:file_id', createShare);
router.get('/', listShares);

export default router;
