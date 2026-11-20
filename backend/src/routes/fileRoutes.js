import express from 'express';
import { uploadFile, listFiles, getFile, deleteFile } from '../controllers/fileController.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.post('/upload', upload.single('file'), uploadFile);
router.post('/', upload.single('file'), uploadFile);
router.get('/', listFiles);
router.get('/:id', getFile);
router.delete('/:id', deleteFile);

export default router;
