import express from 'express';
import { uploadFile, listFiles, deleteFile } from '../controllers/fileController.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// All file routes require authentication
router.use(requireAuth);

router.post('/upload', upload.single('file'), uploadFile);
router.get('/', listFiles);
router.delete('/:file_id', deleteFile);

export default router;
