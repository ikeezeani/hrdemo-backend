const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Stored on disk at backend/uploads/employees, served back out via
// /api/uploads/employees/<filename> (see server.js static mount).
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'employees');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `emp-${req.params.id}-${unique}${ext}`);
  }
});

const uploadPhoto = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, or WEBP images are allowed'));
  }
});

module.exports = uploadPhoto;
