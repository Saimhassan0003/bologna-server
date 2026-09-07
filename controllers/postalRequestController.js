const PostalRequest      = require('../models/PostalRequest');
const postalEmailService = require('../utils/postalEmailService');

// ─── Constants ────────────────────────────────────────────────────────────────

/** All required document field names (multipart/form-data keys). */
const REQUIRED_DOCS = ['identityProof', 'addressProof', 'academicTranscript'];

/** Human-readable labels for emails and UI messages. */
const DOC_LABELS = {
  identityProof:      'Identity Proof (Passport / CNIC)',
  addressProof:       'Address Proof (Utility Bill)',
  academicTranscript: 'Certified Academic Transcript'
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a unique application number — format: PR-YYYYMMDD-XXXX */
const generateApplicationNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand    = Math.floor(1000 + Math.random() * 9000);
  return `PR-${dateStr}-${rand}`;
};

/** Get deadline in milliseconds from env (default: 5 minutes). */
const getDeadlineMs = () => {
  const minutes = parseInt(process.env.DOCUMENT_DEADLINE_MINUTES) || 5;
  return minutes * 60 * 1000;
};

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/postal-requests/my/:studentId
 *
 * Lookup a student's existing application by email.
 * Returns { exists: false, request: null } if no application exists yet.
 */
exports.getMyRequest = async (req, res) => {
  try {
    const studentId = (req.params.studentId || '').trim().toLowerCase();
    if (!studentId) {
      return res.status(400).json({ message: 'Student email is required.' });
    }

    const request = await PostalRequest.findByStudentId(studentId);

    if (!request) {
      return res.json({ exists: false, request: null });
    }

    // On-the-fly expiry check (in case cron hasn't fired yet)
    if (request.status === 'DOCUMENT_PENDING' && request.documentDeadline && new Date(request.documentDeadline) < new Date()) {
      const updatedRequest = await PostalRequest.updateById(request.id, {
        status:    'EXPIRED',
        expiredAt: new Date()
      });

      if (!request.expiryEmailSent) {
        try {
          await Promise.all([
            postalEmailService.notifyAdminExpired(updatedRequest, studentId),
            postalEmailService.notifyStudentExpired(updatedRequest, studentId)
          ]);
          await PostalRequest.updateById(request.id, { expiryEmailSent: true });
        } catch (mailErr) {
          console.error('[SMTP ERROR] Expiry email failed:', mailErr.message);
        }
      }

      return res.json({ exists: true, request: await PostalRequest.findById(request.id) });
    }

    return res.json({ exists: true, request });
  } catch (err) {
    console.error('[POSTAL] getMyRequest error:', err.message);
    return res.status(500).json({ message: 'Server error fetching application.' });
  }
};

/**
 * POST /api/postal-requests
 *
 * Submit a new postal request.
 * Documents are optional — missing ones are tracked in missingDocuments[].
 * A student can only have ONE application at a time.
 */
exports.createPostalRequest = async (req, res) => {
  try {
    const {
      studentId,
      fullName,
      fatherName,
      phone,
      address,
      passportOrCnic,
      programName,
      rollNumber
    } = req.body;

    // ── Validation ────────────────────────────────────────────────────────────
    if (!studentId) {
      return res.status(400).json({ message: 'Student email (ID) is required.' });
    }

    const normalizedId = studentId.trim().toLowerCase();

    // Prevent duplicate applications
    const existing = await PostalRequest.findByStudentId(normalizedId);
    if (existing) {
      return res.status(409).json({
        message: 'You have already submitted a postal request.',
        request: existing
      });
    }

    // ── Parse uploaded files ──────────────────────────────────────────────────
    const uploadedDocs = [];
    if (req.files) {
      REQUIRED_DOCS.forEach((field) => {
        if (req.files[field] && req.files[field][0]) {
          uploadedDocs.push({
            name:       field,
            path:       `/uploads/${req.files[field][0].filename}`,
            uploadedAt: new Date()
          });
        }
      });
    }

    // ── Determine missing documents ───────────────────────────────────────────
    const uploadedNames = uploadedDocs.map((d) => d.name);
    const missingDocs   = REQUIRED_DOCS.filter((d) => !uploadedNames.includes(d));
    const hasAllDocs    = missingDocs.length === 0;

    // ── Status and deadline ───────────────────────────────────────────────────
    let status           = 'DOCUMENT_PENDING';
    let documentDeadline = null;
    let submittedAt      = null;

    if (hasAllDocs) {
      status      = 'SUBMITTED';
      submittedAt = new Date();
    } else {
      documentDeadline = new Date(Date.now() + getDeadlineMs());
    }

    // ── Save to MySQL ─────────────────────────────────────────────────────────
    const savedRequest = await PostalRequest.create({
      studentId:         normalizedId,
      applicationNumber: generateApplicationNumber(),
      formData: { fullName, fatherName, phone, address, passportOrCnic, programName, rollNumber },
      documents:         uploadedDocs,
      missingDocuments:  missingDocs,
      status,
      documentDeadline,
      submittedAt
    });

    // ── Send emails ───────────────────────────────────────────────────────────
    try {
      if (hasAllDocs) {
        await Promise.all([
          postalEmailService.notifyAdminSubmitted(savedRequest, normalizedId),
          postalEmailService.notifyStudentSubmitted(savedRequest, normalizedId)
        ]);
      } else {
        await Promise.all([
          postalEmailService.notifyAdminPending(savedRequest, normalizedId),
          postalEmailService.notifyStudentPending(savedRequest, normalizedId)
        ]);
      }
    } catch (mailErr) {
      console.error('[SMTP ERROR] Submission email failed:', mailErr.message);
    }

    // ── Response ──────────────────────────────────────────────────────────────
    const deadlineMinutes = parseInt(process.env.DOCUMENT_DEADLINE_MINUTES) || 5;
    return res.status(201).json({
      message: hasAllDocs
        ? 'Your postal request has been submitted successfully. Confirmation email sent.'
        : `Your postal request has been submitted successfully. Some required documents are still pending. Please upload them within ${deadlineMinutes} minutes.`,
      request: savedRequest
    });

  } catch (err) {
    console.error('[POSTAL] createPostalRequest error:', err.message);
    return res.status(500).json({ message: 'Server error during submission.' });
  }
};

/**
 * GET /api/postal-requests/:id
 *
 * Fetch a specific postal request by its id.
 * Used internally and by admin.
 */
exports.getRequestById = async (req, res) => {
  try {
    const request = await PostalRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Postal request not found.' });
    }

    // On-the-fly expiry check
    if (request.status === 'DOCUMENT_PENDING' && request.documentDeadline && new Date(request.documentDeadline) < new Date()) {
      const updated = await PostalRequest.updateById(request.id, {
        status:    'EXPIRED',
        expiredAt: new Date()
      });

      if (!request.expiryEmailSent) {
        try {
          await Promise.all([
            postalEmailService.notifyAdminExpired(updated, updated.studentId),
            postalEmailService.notifyStudentExpired(updated, updated.studentId)
          ]);
          await PostalRequest.updateById(request.id, { expiryEmailSent: true });
        } catch (mailErr) {
          console.error('[SMTP ERROR] Expiry email failed:', mailErr.message);
        }
      }

      return res.json(await PostalRequest.findById(request.id));
    }

    return res.json(request);
  } catch (err) {
    console.error('[POSTAL] getRequestById error:', err.message);
    return res.status(500).json({ message: 'Server error.' });
  }
};

/**
 * POST /api/postal-requests/:id/upload
 *
 * Upload only the missing documents for an existing DOCUMENT_PENDING request.
 * - Validates deadline has not passed
 * - Only accepts doc keys that are in missingDocuments[]
 * - Transitions to SUBMITTED when all docs are present
 */
exports.uploadMissingDocuments = async (req, res) => {
  try {
    const request = await PostalRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Postal request not found.' });
    }

    if (request.status === 'SUBMITTED') {
      return res.status(400).json({ message: 'All documents have already been submitted.' });
    }

    if (request.status === 'EXPIRED') {
      return res.status(400).json({ message: 'This request has expired. No further uploads are permitted.' });
    }

    // Real-time expiry check
    if (request.documentDeadline && new Date(request.documentDeadline) < new Date()) {
      const expired = await PostalRequest.updateById(request.id, {
        status:    'EXPIRED',
        expiredAt: new Date()
      });

      if (!request.expiryEmailSent) {
        try {
          await Promise.all([
            postalEmailService.notifyAdminExpired(expired, expired.studentId),
            postalEmailService.notifyStudentExpired(expired, expired.studentId)
          ]);
          await PostalRequest.updateById(request.id, { expiryEmailSent: true });
        } catch (mailErr) {
          console.error('[SMTP ERROR] Expiry email failed:', mailErr.message);
        }
      }

      return res.status(400).json({ message: 'Upload deadline has passed. This request has expired.' });
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ message: 'No files were provided.' });
    }

    // ── Only accept uploads for documents still in missingDocuments[] ─────────
    const newDocs = [];

    for (const field of REQUIRED_DOCS) {
      if (req.files[field] && req.files[field][0]) {
        const isMissing   = request.missingDocuments.includes(field);
        const alreadyHave = request.documents.some((d) => d.name === field);

        if (!isMissing || alreadyHave) continue; // skip silently

        newDocs.push({
          name:       field,
          path:       `/uploads/${req.files[field][0].filename}`,
          uploadedAt: new Date()
        });
      }
    }

    if (newDocs.length === 0) {
      return res.status(400).json({ message: 'No valid pending documents were uploaded.' });
    }

    // Compute remaining missing documents after this upload
    const uploadedNames      = newDocs.map((d) => d.name);
    const remainingMissing   = request.missingDocuments.filter((d) => !uploadedNames.includes(d));
    const allComplete        = remainingMissing.length === 0;

    const parentUpdates = { missingDocuments: remainingMissing };
    if (allComplete) {
      parentUpdates.status           = 'SUBMITTED';
      parentUpdates.submittedAt      = new Date();
      parentUpdates.documentDeadline = null;
    }

    // updateById handles both parent row + new child document inserts in one transaction
    const updated = await PostalRequest.updateById(request.id, parentUpdates, newDocs);

    // ── Send completion emails ────────────────────────────────────────────────
    if (allComplete) {
      try {
        await Promise.all([
          postalEmailService.notifyAdminDocsUploaded(updated, updated.studentId),
          postalEmailService.notifyStudentDocsUploaded(updated, updated.studentId)
        ]);
      } catch (mailErr) {
        console.error('[SMTP ERROR] Completion email failed:', mailErr.message);
      }
    }

    return res.json({
      message: allComplete
        ? 'All required documents uploaded. Application submitted successfully!'
        : `Document(s) uploaded. ${updated.missingDocuments.length} document(s) still pending.`,
      request: updated
    });

  } catch (err) {
    console.error('[POSTAL] uploadMissingDocuments error:', err.message);
    return res.status(500).json({ message: 'Server error during upload.' });
  }
};

/**
 * POST /api/postal-requests/track
 *
 * Public tracking by studentId + applicationNumber.
 */
exports.trackRequest = async (req, res) => {
  try {
    const { studentId, applicationNumber } = req.body;

    if (!studentId || !applicationNumber) {
      return res.status(400).json({ message: 'Both student email and application number are required.' });
    }

    const request = await PostalRequest.findByTrack(studentId, applicationNumber);

    if (!request) {
      return res.status(404).json({ message: 'No matching application found.' });
    }

    // On-the-fly expiry
    if (request.status === 'DOCUMENT_PENDING' && request.documentDeadline && new Date(request.documentDeadline) < new Date()) {
      const updated = await PostalRequest.updateById(request.id, {
        status:    'EXPIRED',
        expiredAt: new Date()
      });
      return res.json(updated);
    }

    return res.json(request);
  } catch (err) {
    console.error('[POSTAL] trackRequest error:', err.message);
    return res.status(500).json({ message: 'Server error.' });
  }
};
