import express from 'express';
import { createShare, listShares, revokeShare } from '../controllers/shareController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.post('/:id', createShare);
router.get('/', listShares);
router.post('/:id/revoke', revokeShare);

export default router;
