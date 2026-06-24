const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const ctrl    = require('../controllers/postalRequestController');

// ─── Multer Storage ───────────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const safeName = file.fieldname.replace(/[^a-z0-9]/gi, '-');
    cb(null, `postal-${Date.now()}-${safeName}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
  const ext     = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, JPEG, and PNG are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

// Handles the 3 required document fields
const docUpload = upload.fields([
  { name: 'identityProof',      maxCount: 1 },
  { name: 'addressProof',       maxCount: 1 },
  { name: 'academicTranscript', maxCount: 1 }
]);

// Wrap multer to return clean JSON errors
const withUpload = (req, res, next) => {
  docUpload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum 10 MB per file.' });
      }
      return res.status(400).json({ message: err.message });
    }
    return res.status(400).json({ message: err.message });
  });
};

// ─── Routes ───────────────────────────────────────────────────────────────────

// Submit a new postal request (full form + optional files)
router.post('/', withUpload, ctrl.createPostalRequest);

// Lookup student's own application by email
// IMPORTANT: /my/:studentId must be declared BEFORE /:id
router.get('/my/:studentId', ctrl.getMyRequest);

// Public tracking by studentId + applicationNumber
router.post('/track', ctrl.trackRequest);

// Upload missing documents for an existing DOCUMENT_PENDING request
router.post('/:id/upload', withUpload, ctrl.uploadMissingDocuments);

// Get a specific request by MongoDB _id (admin / internal use)
router.get('/:id', ctrl.getRequestById);

module.exports = router;
