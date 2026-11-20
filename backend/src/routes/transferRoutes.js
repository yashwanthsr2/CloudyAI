import express from 'express';
import { getTransferInfo, requestOtp, verifyOtp, downloadMaskedFile } from '../controllers/transferController.js';

const router = express.Router();

// Publicly accessible with server-side validation
router.get('/:token', getTransferInfo);
router.post('/:token/request-otp', requestOtp);
router.post('/:token/verify-otp', verifyOtp);
router.post('/:token/download', downloadMaskedFile);

export default router;
