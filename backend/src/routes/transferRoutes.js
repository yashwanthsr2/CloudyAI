import express from 'express';
import { getTransferInfo, downloadMaskedFile, viewMaskedFile } from '../controllers/transferController.js';

const router = express.Router();

// Public routes (NO AUTHENTICATION REQUIRED)
router.get('/:token', getTransferInfo);
router.get('/:token/download', downloadMaskedFile);
router.get('/:token/view', viewMaskedFile);

export default router;
