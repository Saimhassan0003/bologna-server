const PostalRequest = require('../models/PostalRequest');
const postalEmailService = require('../utils/postalEmailService');

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * All required document field names.
 * These are the keys used in multipart/form-data uploads.
 */
const REQUIRED_DOCS = ['identityProof', 'addressProof', 'academicTranscript'];

/** Human-readable labels for emails and UI messages */
const DOC_LABELS = {
  identityProof:      'Identity Proof (Passport / CNIC)',
  addressProof:       'Address Proof (Utility Bill)',
  academicTranscript: 'Certified Academic Transcript'
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a unique application number — format: PR-YYYYMMDD-XXXX
 */
const generateApplicationNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PR-${dateStr}-${rand}`;
};

/**
 * Get deadline in milliseconds from env (default: 5 minutes)
 */
const getDeadlineMs = () => {
  const minutes = parseInt(process.env.DOCUMENT_DEADLINE_MINUTES) || 5;
  return minutes * 60 * 1000;
};

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/postal-requests/my/:studentId
 *
 * Lookup a student's existing application by email.
 * Returns null if no application exists yet.
 */
exports.getMyRequest = async (req, res) => {
  try {
    const studentId = (req.params.studentId || '').trim().toLowerCase();
    if (!studentId) {
      return res.status(400).json({ message: 'Student email is required.' });
    }

    const request = await PostalRequest.findOne({ studentId });

    if (!request) {
      // No application exists — student should see the form
      return res.json({ exists: false, request: null });
    }

    // On-the-fly expiry check (in case cron hasn't fired yet)
    if (request.status === 'DOCUMENT_PENDING' && request.documentDeadline < new Date()) {
      request.status = 'EXPIRED';
      request.expiredAt = new Date();
      await request.save();

      // Send expiry emails if not already sent
      if (!request.expiryEmailSent) {
        try {
          await Promise.all([
            postalEmailService.notifyAdminExpired(request, request.studentId),
            postalEmailService.notifyStudentExpired(request, request.studentId)
          ]);
          request.expiryEmailSent = true;
          await request.save();
        } catch (mailErr) {
          console.error('[SMTP ERROR] Expiry email failed:', mailErr.message);
        }
      }
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

    // ── Validation ──────────────────────────────────────────────────────────
    if (!studentId) {
      return res.status(400).json({ message: 'Student email (ID) is required.' });
    }

    const normalizedId = studentId.trim().toLowerCase();

    // Prevent duplicate applications
    const existing = await PostalRequest.findOne({ studentId: normalizedId });
    if (existing) {
      return res.status(409).json({
        message: 'You have already submitted a postal request.',
        request: existing
      });
    }

    // ── Parse uploaded files ─────────────────────────────────────────────────
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

    // ── Determine missing documents ──────────────────────────────────────────
    const uploadedNames  = uploadedDocs.map((d) => d.name);
    const missingDocs    = REQUIRED_DOCS.filter((d) => !uploadedNames.includes(d));
    const hasAllDocs     = missingDocs.length === 0;

    // ── Status and deadline ──────────────────────────────────────────────────
    let status           = 'DOCUMENT_PENDING';
    let documentDeadline = null;
    let submittedAt      = null;

    if (hasAllDocs) {
      status      = 'SUBMITTED';
      submittedAt = new Date();
    } else {
      documentDeadline = new Date(Date.now() + getDeadlineMs());
    }

    // ── Save to DB ───────────────────────────────────────────────────────────
    const newRequest = new PostalRequest({
      studentId:    normalizedId,
      applicationNumber: generateApplicationNumber(),
      formData: {
        fullName,
        fatherName,
        phone,
        address,
        passportOrCnic,
        programName,
        rollNumber
      },
      documents:        uploadedDocs,
      missingDocuments: missingDocs,
      status,
      documentDeadline,
      submittedAt
    });

    const savedRequest = await newRequest.save();

    // ── Send emails ──────────────────────────────────────────────────────────
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

    // ── Response ─────────────────────────────────────────────────────────────
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
 * Fetch a specific postal request by its MongoDB _id.
 * Used internally and by admin.
 */
exports.getRequestById = async (req, res) => {
  try {
    const request = await PostalRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Postal request not found.' });
    }

    // On-the-fly expiry check
    if (request.status === 'DOCUMENT_PENDING' && request.documentDeadline < new Date()) {
      request.status    = 'EXPIRED';
      request.expiredAt = new Date();
      await request.save();

      if (!request.expiryEmailSent) {
        try {
          await Promise.all([
            postalEmailService.notifyAdminExpired(request, request.studentId),
            postalEmailService.notifyStudentExpired(request, request.studentId)
          ]);
          request.expiryEmailSent = true;
          await request.save();
        } catch (mailErr) {
          console.error('[SMTP ERROR] Expiry email failed:', mailErr.message);
        }
      }
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
    if (request.documentDeadline && request.documentDeadline < new Date()) {
      request.status    = 'EXPIRED';
      request.expiredAt = new Date();
      await request.save();

      if (!request.expiryEmailSent) {
        try {
          await Promise.all([
            postalEmailService.notifyAdminExpired(request, request.studentId),
            postalEmailService.notifyStudentExpired(request, request.studentId)
          ]);
          request.expiryEmailSent = true;
          await request.save();
        } catch (mailErr) {
          console.error('[SMTP ERROR] Expiry email failed:', mailErr.message);
        }
      }

      return res.status(400).json({ message: 'Upload deadline has passed. This request has expired.' });
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ message: 'No files were provided.' });
    }

    // ── Only accept uploads for documents still in missingDocuments[] ────────
    const newDocs = [];

    for (const field of REQUIRED_DOCS) {
      if (req.files[field] && req.files[field][0]) {
        // Ensure it's actually missing (not already uploaded)
        const isMissing   = request.missingDocuments.includes(field);
        const alreadyHave = request.documents.some((d) => d.name === field);

        if (!isMissing || alreadyHave) {
          // Skip silently — client should not have sent this
          continue;
        }

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

    // Add new docs and remove them from missingDocuments
    request.documents.push(...newDocs);
    const uploadedNames    = newDocs.map((d) => d.name);
    request.missingDocuments = request.missingDocuments.filter(
      (d) => !uploadedNames.includes(d)
    );

    // Check if all documents are now complete
    const allComplete = request.missingDocuments.length === 0;

    if (allComplete) {
      request.status           = 'SUBMITTED';
      request.submittedAt      = new Date();
      request.documentDeadline = null; // clear the deadline
    }

    const updated = await request.save();

    // ── Send completion emails ───────────────────────────────────────────────
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
 * Used on the public tracking page.
 */
exports.trackRequest = async (req, res) => {
  try {
    const { studentId, applicationNumber } = req.body;

    if (!studentId || !applicationNumber) {
      return res.status(400).json({ message: 'Both student email and application number are required.' });
    }

    const request = await PostalRequest.findOne({
      studentId:         studentId.trim().toLowerCase(),
      applicationNumber: applicationNumber.trim()
    });

    if (!request) {
      return res.status(404).json({ message: 'No matching application found.' });
    }

    // On-the-fly expiry
    if (request.status === 'DOCUMENT_PENDING' && request.documentDeadline < new Date()) {
      request.status    = 'EXPIRED';
      request.expiredAt = new Date();
      await request.save();
    }

    return res.json(request);
  } catch (err) {
    console.error('[POSTAL] trackRequest error:', err.message);
    return res.status(500).json({ message: 'Server error.' });
  }
};
