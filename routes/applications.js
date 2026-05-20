const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Application = require('../models/Application');
const authMiddleware = require('../middleware/authMiddleware');

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.fieldname}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const cpUpload = upload.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'passportCopy', maxCount: 1 },
  { name: 'resume', maxCount: 1 },
  { name: 'transcript1', maxCount: 1 },
  { name: 'transcript2', maxCount: 1 },
  { name: 'transcript3', maxCount: 1 }
]);

// Submit a new application (Public)
router.post('/', cpUpload, async (req, res) => {
  try {
    const { 
      fullName, 
      certificateName, 
      dob, 
      gender, 
      email, 
      phone,
      passportNumber, 
      country,
      address,
      department,
      programme,
      intake,
      creditHours,
      price,
      registrationViaCentre,
      centreEmail,
      centrePhone,
      highestQualification
    } = req.body;

    // Check if required files were uploaded
    if (!req.files || 
        !req.files['profilePicture'] || 
        !req.files['passportCopy'] || 
        !req.files['resume'] || 
        !req.files['transcript1']) {
      return res.status(400).json({ 
        message: 'Required files (Profile Picture, ID/Passport, Resume/CV, and Certified Transcript 1) are missing.' 
      });
    }

    const profilePicturePath = `/uploads/${req.files['profilePicture'][0].filename}`;
    const passportCopyPath = `/uploads/${req.files['passportCopy'][0].filename}`;
    const resumePath = `/uploads/${req.files['resume'][0].filename}`;
    const transcript1Path = `/uploads/${req.files['transcript1'][0].filename}`;
    
    // Optional Transcripts
    const transcript2Path = req.files['transcript2'] ? `/uploads/${req.files['transcript2'][0].filename}` : '';
    const transcript3Path = req.files['transcript3'] ? `/uploads/${req.files['transcript3'][0].filename}` : '';

    const newApplication = new Application({
      fullName,
      certificateName,
      dob,
      gender,
      email,
      phone,
      passportNumber,
      country,
      address,
      department,
      programme,
      intake,
      creditHours,
      price,
      registrationViaCentre,
      centreEmail: registrationViaCentre === 'Yes' ? centreEmail : '',
      centrePhone: registrationViaCentre === 'Yes' ? centrePhone : '',
      highestQualification,
      profilePicture: profilePicturePath,
      passportCopy: passportCopyPath,
      resume: resumePath,
      transcript1: transcript1Path,
      transcript2: transcript2Path,
      transcript3: transcript3Path
    });

    const savedApplication = await newApplication.save();
    res.status(201).json(savedApplication);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get all applications
router.get('/', authMiddleware, async (req, res) => {
  try {
    const applications = await Application.find().sort({ submissionDate: -1 });
    res.json(applications);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update application status
router.patch('/:id/status', authMiddleware, async (req, res) => {
  const { status } = req.body;
  
  if (!['Pending', 'Reviewed', 'Accepted', 'Rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }

  try {
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    application.status = status;
    await application.save();

    res.json(application);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
