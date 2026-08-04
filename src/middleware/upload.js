const multer = require('multer');

// Memory storage — files are parsed directly from the buffer (see utils/xlsx.js)
// and never written to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv'
    ];
    const allowedExt = /\.(xlsx|xls|csv)$/i.test(file.originalname);
    if (allowedMimes.includes(file.mimetype) || allowedExt) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx, .xls, or .csv files are allowed'));
    }
  }
});

module.exports = upload;
