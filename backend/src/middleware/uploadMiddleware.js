import multer from 'multer';

// Store files in memory buffer so they can be processed and pushed directly to Supabase Storage
const storage = multer.memoryStorage();

// Allowed file types: Images (JPG, PNG, WEBP) and PDF
const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
];

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB maximum file size limit
  },
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, WEBP, and PDF files are permitted.`), false);
    }
  }
});
