import multer from 'multer';

// In-memory buffer storage
const storage = multer.memoryStorage();

// Supported image types ONLY: JPG, JPEG, PNG
const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png'
];

export const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB maximum individual file limit
  },
  fileFilter: (req, file, cb) => {
    const isAllowedMime = allowedMimeTypes.includes(file.mimetype.toLowerCase());
    const isAllowedExt = /\.(jpe?g|png)$/i.test(file.originalname);

    if (isAllowedMime && isAllowedExt) {
      cb(null, true);
    } else {
      const err = new Error(
        `Invalid file format: ${file.originalname}. PRIVACLOUD AI strictly accepts JPG, JPEG, and PNG images only (PDF is not permitted).`
      );
      err.code = 'INVALID_FILE_TYPE';
      cb(err, false);
    }
  }
});
