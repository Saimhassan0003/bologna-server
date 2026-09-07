const express        = require('express');
const router         = express.Router();
const multer         = require('multer');
const path           = require('path');
const Application    = require('../models/Application');
const authMiddleware = require('../middleware/authMiddleware');
const emailService   = require('../utils/emailService');
const { logActivity }= require('../utils/logger');
const crypto         = require('crypto');

// ─── Multer Config ────────────────────────────────────────────────────────────

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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

const cpUpload = upload.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'passportCopy',   maxCount: 1 },
  { name: 'resume',         maxCount: 1 },
  { name: 'transcript1',    maxCount: 1 },
  { name: 'transcript2',    maxCount: 1 },
  { name: 'transcript3',    maxCount: 1 }
]);

// ─── Submit a new application (Public) ───────────────────────────────────────

router.post('/', cpUpload, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
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
      courseStartDate,
      courseEndDate,
      intake,
      creditHours,
      price,
      registrationViaCentre,
      centreName,
      centreEmail,
      centrePhone,
      highestQualification
    } = req.body;

    // Check for duplicate email
    if (email) {
      const existingApp = await Application.findByEmail(email);
      if (existingApp) {
        return res.status(400).json({
          message: 'This email address has already been used for an application. Please use a different email address.'
        });
      }
    }

    const profilePicturePath = req.files?.['profilePicture'] ? `/uploads/${req.files['profilePicture'][0].filename}` : '';
    const passportCopyPath   = req.files?.['passportCopy']   ? `/uploads/${req.files['passportCopy'][0].filename}`   : '';
    const resumePath         = req.files?.['resume']         ? `/uploads/${req.files['resume'][0].filename}`         : '';
    const transcript1Path    = req.files?.['transcript1']    ? `/uploads/${req.files['transcript1'][0].filename}`    : '';
    const transcript2Path    = req.files?.['transcript2']    ? `/uploads/${req.files['transcript2'][0].filename}`    : '';
    const transcript3Path    = req.files?.['transcript3']    ? `/uploads/${req.files['transcript3'][0].filename}`    : '';

    // Track missing documents
    const missingDocuments = [];
    if (!profilePicturePath) missingDocuments.push('profilePicture');
    if (!passportCopyPath)   missingDocuments.push('passportCopy');
    if (!resumePath)         missingDocuments.push('resume');
    if (!transcript1Path)    missingDocuments.push('transcript1');
    if (!transcript2Path)    missingDocuments.push('transcript2');
    if (!transcript3Path)    missingDocuments.push('transcript3');

    const computedFullName = fullName || `${firstName || ''} ${lastName || ''}`.trim();

    let status          = 'Submitted';
    let documentDeadline = null;
    const submissionDate = new Date();

    if (missingDocuments.length > 0) {
      status = 'PendingDocuments';
      const dd = new Date(submissionDate);
      dd.setMonth(dd.getMonth() + 2); // 2 months deadline
      documentDeadline = dd;
    }

    const referenceNumber = `REF-${submissionDate.getTime().toString(36).toUpperCase()}`;
    const uniqueToken     = crypto.randomBytes(12).toString('hex');

    // Insert into MySQL — uploadLink is built after we know the new id
    const savedApplication = await Application.create({
      firstName,
      lastName,
      fullName:             computedFullName,
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
      courseStartDate,
      courseEndDate,
      intake,
      creditHours,
      price,
      registrationViaCentre,
      centreName:  registrationViaCentre === 'Yes' ? centreName  : '',
      centreEmail: registrationViaCentre === 'Yes' ? centreEmail : '',
      centrePhone: registrationViaCentre === 'Yes' ? centrePhone : '',
      highestQualification,
      profilePicture: profilePicturePath,
      passportCopy:   passportCopyPath,
      resume:         resumePath,
      transcript1:    transcript1Path,
      transcript2:    transcript2Path,
      transcript3:    transcript3Path,
      status,
      documentDeadline,
      missingDocuments,
      referenceNumber,
      uniqueToken,
      submissionDate,
      uploadLink: '', // placeholder — set below after we have the id
      documentsUploadedCompleted: false,
    });

    

    // Build the upload link now that we have the real id
    const uploadLink = `${process.env.CLIENT_URL}/upload-documents/${savedApplication.id}`;
    let finalApplication = savedApplication;

    const actionMsg = status === 'Submitted'
      ? 'submitted with all documents'
      : `submitted with pending documents (${missingDocuments.length} missing)`;

    await logActivity(
      'Application Submitted',
      `New application ${actionMsg} by ${computedFullName} for the ${programme} program`,
      'application',
      'User'
    );

    if (missingDocuments.length === 0) {
      // All docs provided at once — mark complete
      finalApplication = await Application.updateById(savedApplication.id, {
        uploadLink:                 '',
        documentSubmittedAt:        submissionDate,
        docsUploadedAt:             submissionDate,
        documentsUploadedCompleted: true,
      });
    } else {
      finalApplication = await Application.updateById(savedApplication.id, { uploadLink });
    }

    try {
      await emailService.sendSubmissionEmails(finalApplication);
    } catch (mailErr) {
      console.error('[SMTP ERROR] Failed to send submission emails:', mailErr.message);
    }

    res.status(201).json({
      ...finalApplication,
      message: status === 'Submitted'
        ? 'Application submitted successfully!'
        : `Application submitted. Please upload ${missingDocuments.length} remaining document(s) within 2 months.`
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── Get all applications (Admin only) ───────────────────────────────────────

router.get('/', authMiddleware, async (req, res) => {
  try {
    const applications = await Application.findAll();
    res.json(applications);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── Get a single application by ID (public — for document upload view) ──────

router.get('/:id', async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.documentsUploadedCompleted || application.status !== 'PendingDocuments') {
      return res.status(400).json({ message: 'Documents have already been uploaded for this email address. Multiple uploads are not allowed.' });
    }

    res.json({
      _id:              application.id,
      id:               application.id,
      status:           application.status,
      submissionDate:   application.submissionDate,
      documentDeadline: application.documentDeadline,
      missingDocuments: application.missingDocuments
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── Update application status (Admin only) ───────────────────────────────────

router.patch('/:id/status', authMiddleware, async (req, res) => {
  const { status, rejectionReason } = req.body;

  if (!['Submitted', 'PendingDocuments', 'Reviewed', 'Accepted', 'Rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }

  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const previousStatus = application.status;

    const updates = { status };
    if (status === 'Rejected') {
      updates.rejectionReason = rejectionReason || '';
    }

    const updated = await Application.updateById(application.id, updates);

    await logActivity(
      'Status Updated',
      `Application status of ${updated.fullName} was changed from "${previousStatus}" to "${status}"`,
      'status',
      'Admin'
    );

    if (status === 'Accepted' && previousStatus !== 'Accepted') {
      try {
        await emailService.sendApprovalEmails(updated);
      } catch (mailErr) {
        console.error('[SMTP ERROR] Failed to send approval emails:', mailErr.message);
      }
    }

    if (status === 'Rejected' && previousStatus !== 'Rejected') {
      try {
        await emailService.sendRejectionEmail(updated, rejectionReason || '');
      } catch (mailErr) {
        console.error('[SMTP ERROR] Failed to send rejection email:', mailErr.message);
      }
    }

    res.json(updated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── Upload / attach documents to an existing application (public) ────────────

router.post('/:id/documents', cpUpload, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });

    if (application.documentsUploadedCompleted || application.status !== 'PendingDocuments') {
      return res.status(400).json({ message: 'Documents have already been uploaded for this email address. Multiple uploads are not allowed.' });
    }

    if (application.documentDeadline && new Date(application.documentDeadline) < new Date()) {
      return res.status(400).json({ message: 'Document upload deadline has expired.' });
    }

    const fileMap = req.files || {};
    const missing = application.missingDocuments || [];

    // All currently-missing docs must be uploaded together
    const missingUploads = [];
    if (missing.includes('profilePicture') && !fileMap['profilePicture']) missingUploads.push('profilePicture');
    if (missing.includes('passportCopy')   && !fileMap['passportCopy'])   missingUploads.push('passportCopy');
    if (missing.includes('resume')         && !fileMap['resume'])         missingUploads.push('resume');
    if (missing.includes('transcript1')    && !fileMap['transcript1'])    missingUploads.push('transcript1');
    if (missing.includes('transcript2')    && !fileMap['transcript2'])    missingUploads.push('transcript2');
    if (missing.includes('transcript3')    && !fileMap['transcript3'])    missingUploads.push('transcript3');

    if (missingUploads.length > 0) {
      const fs = require('fs');
      Object.keys(fileMap).forEach((fieldname) => {
        fileMap[fieldname].forEach((file) => {
          try { fs.unlinkSync(file.path); } catch (e) { console.error('Cleanup error:', e.message); }
        });
      });
      return res.status(400).json({
        message: `All missing documents must be uploaded together. Missing: ${missingUploads.join(', ')}`
      });
    }

    // Build update object
    const updateData = {};
    if (fileMap['profilePicture']) updateData.profilePicture = `/uploads/${fileMap['profilePicture'][0].filename}`;
    if (fileMap['passportCopy'])   updateData.passportCopy   = `/uploads/${fileMap['passportCopy'][0].filename}`;
    if (fileMap['resume'])         updateData.resume         = `/uploads/${fileMap['resume'][0].filename}`;
    if (fileMap['transcript1'])    updateData.transcript1    = `/uploads/${fileMap['transcript1'][0].filename}`;
    if (fileMap['transcript2'])    updateData.transcript2    = `/uploads/${fileMap['transcript2'][0].filename}`;
    if (fileMap['transcript3'])    updateData.transcript3    = `/uploads/${fileMap['transcript3'][0].filename}`;

    // Recompute missingDocuments after this upload
    const currentProfile = updateData.profilePicture || application.profilePicture;
    const currentPassport = updateData.passportCopy   || application.passportCopy;
    const currentResume  = updateData.resume          || application.resume;
    const currentT1      = updateData.transcript1     || application.transcript1;
    const currentT2      = updateData.transcript2     || application.transcript2;
    const currentT3      = updateData.transcript3     || application.transcript3;

    const newMissing = [];
    if (!currentProfile) newMissing.push('profilePicture');
    if (!currentPassport) newMissing.push('passportCopy');
    if (!currentResume)  newMissing.push('resume');
    if (!currentT1)      newMissing.push('transcript1');
    if (!currentT2)      newMissing.push('transcript2');
    if (!currentT3)      newMissing.push('transcript3');

    updateData.missingDocuments = newMissing;

    if (newMissing.length === 0) {
      updateData.status                     = 'Submitted';
      updateData.documentDeadline           = null;
      updateData.documentSubmittedAt        = new Date();
      updateData.docsUploadedAt             = new Date();
      updateData.documentsUploadedCompleted = true;
      updateData.uploadLink                 = '';
    } else {
      updateData.status = 'PendingDocuments';
      if (!application.documentDeadline) {
        const d = new Date(application.submissionDate || Date.now());
        d.setMonth(d.getMonth() + 2);
        updateData.documentDeadline = d;
      }
    }

    const updated = await Application.updateById(application.id, updateData);

    await logActivity(
      'Documents Uploaded',
      `Documents uploaded for application ${updated.id} by ${updated.fullName}`,
      'application',
      'User'
    );

    try {
      if (updated.documentsUploadedCompleted) {
        await emailService.sendDocumentUploadConfirmationEmails(updated);
      } else {
        await emailService.sendSubmissionEmails(updated);
      }
    } catch (mailErr) {
      console.error('[SMTP ERROR] Failed to send document-update emails:', mailErr.message);
    }

    res.json({
      application: updated,
      message: missing.length === 0
        ? 'All documents uploaded. Application complete.'
        : `Documents attached. ${missing.length} document(s) still pending.`
    });
  } catch (err) {
    console.error('Attach documents error', err.message);
    res.status(500).json({ message: 'Server error while attaching documents' });
  }
});

module.exports = router;
