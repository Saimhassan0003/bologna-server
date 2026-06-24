const nodemailer = require('nodemailer');

// ─── Transporter ──────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host:   'smtp.gmail.com',
  port:   587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: { rejectUnauthorized: false }
});

// ─── Email Template ───────────────────────────────────────────────────────────

const getBaseTemplate = (title, contentHeader, contentBody) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0; padding: 0;
      background-color: #f8fafc;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
    }
    .wrapper  { width: 100%; background-color: #f8fafc; padding: 40px 0; }
    .container {
      max-width: 600px; margin: 0 auto; background: #fff;
      border-radius: 16px; overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,.05); border: 1px solid #e2e8f0;
    }
    .header {
      background-color: #9B1C31; padding: 35px 40px;
      text-align: center; border-bottom: 4px solid #721422;
    }
    .header h1 { color:#fff; margin:0; font-size:22px; font-weight:700; }
    .header p  { color:#fca5a5; margin:5px 0 0; font-size:12px; font-weight:600;
                 text-transform:uppercase; letter-spacing:1px; }
    .content { padding: 40px; }
    .content h2 { margin-top:0; font-size:18px; font-weight:700; color:#0f172a; }
    .content p  { font-size:14px; line-height:1.7; color:#475569; margin-bottom:20px; }
    .table-container { border:1px solid #e2e8f0; border-radius:10px; overflow:hidden; margin-bottom:24px; }
    .detail-table { width:100%; border-collapse:collapse; font-size:13px; }
    .detail-table th {
      background:#f8fafc; font-weight:600; color:#475569;
      text-align:left; padding:11px 16px; border-bottom:1px solid #e2e8f0; width:38%;
    }
    .detail-table td { padding:11px 16px; border-bottom:1px solid #e2e8f0; color:#0f172a; word-break:break-word; }
    .detail-table tr:last-child th,
    .detail-table tr:last-child td { border-bottom:none; }
    .badge         { display:inline-block; padding:3px 10px; border-radius:9999px; font-size:11px; font-weight:700;
                     background:#fef3c7; color:#d97706; text-transform:uppercase; letter-spacing:.5px; }
    .badge-success { background:#dcfce7; color:#15803d; }
    .badge-danger  { background:#fee2e2; color:#b91c1c; }
    .doc-list      { list-style:none; margin:0; padding:0; }
    .doc-list li   { padding:8px 0; border-bottom:1px solid #f1f5f9; font-size:13px; color:#374151; }
    .doc-list li:last-child { border-bottom:none; }
    .doc-missing   { color:#d97706; font-weight:600; }
    .doc-ok        { color:#15803d; font-weight:600; }
    .alert-box {
      border-radius:8px; padding:14px 18px; margin-bottom:20px;
      font-size:13px; line-height:1.6;
    }
    .alert-warning { background:#fffbeb; border-left:4px solid #f59e0b; color:#92400e; }
    .alert-success { background:#f0fdf4; border-left:4px solid #22c55e; color:#166534; }
    .alert-danger  { background:#fef2f2; border-left:4px solid #ef4444; color:#991b1b; }
    .footer {
      background:#f8fafc; padding:24px 40px; text-align:center;
      font-size:11px; color:#94a3b8; border-top:1px solid #f1f5f9; line-height:1.6;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>UTAMED Postal Request System</h1>
        <p>Student Document Workflow</p>
      </div>
      <div class="content">
        <h2>${contentHeader}</h2>
        ${contentBody}
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} UTAMED. All rights reserved.</p>
        <p>This is an automated notification from the Postal Request System.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

// ─── Send Helper ──────────────────────────────────────────────────────────────

const sendEmail = async (to, subject, html) => {
  const from = process.env.EMAIL_USER || 'noreply@utamed.com';
  try {
    await transporter.sendMail({ from: `"UTAMED Postal System" <${from}>`, to, subject, html });
    console.log(`[SMTP] ✅ Email sent to ${to}: "${subject}"`);
    return true;
  } catch (err) {
    console.error(`[SMTP] ❌ Failed to send to ${to}:`, err.message);
    return false;
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format a date nicely for emails */
const fmt = (d) => d ? new Date(d).toLocaleString('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit'
}) : '—';

/** Build a detail table row */
const row = (label, value) =>
  `<tr><th>${label}</th><td>${value}</td></tr>`;

/** Build an HTML list of missing doc names */
const missingDocsList = (docs) =>
  docs.length === 0
    ? '<em>None — all documents received.</em>'
    : `<ul class="doc-list">${docs.map(d =>
        `<li class="doc-missing">⚠️ ${DOC_LABELS[d] || d}</li>`
      ).join('')}</ul>`;

/** Build checklist of all docs with ✓ / ✗ */
const docChecklist = (uploaded, missing) => {
  const all = ['identityProof', 'addressProof', 'academicTranscript'];
  return `<ul class="doc-list">${all.map(key => {
    const ok = uploaded.some(u => u.name === key);
    return `<li class="${ok ? 'doc-ok' : 'doc-missing'}">${ok ? '✅' : '❌'} ${DOC_LABELS[key] || key}</li>`;
  }).join('')}</ul>`;
};

const DOC_LABELS = {
  identityProof:      'Identity Proof (Passport / CNIC)',
  addressProof:       'Address Proof (Utility Bill)',
  academicTranscript: 'Certified Academic Transcript'
};

// ─── Email Functions ──────────────────────────────────────────────────────────

/**
 * 1. Admin — new application fully submitted (all docs present)
 */
const notifyAdminSubmitted = async (request, studentEmail) => {
  const to      = process.env.ADMIN_EMAIL || 'admin@utamed.com';
  const subject = `[SUBMITTED] New Postal Request — ${request.applicationNumber}`;
  const html    = getBaseTemplate(subject, 'New Postal Request Submitted', `
    <p>Hello Admin,</p>
    <p>A new postal request has been submitted with <strong>all required documents</strong>.</p>
    <div class="table-container">
      <table class="detail-table">
        ${row('Application Number', `<strong>${request.applicationNumber}</strong>`)}
        ${row('Student Email', studentEmail)}
        ${row('Full Name', request.formData?.fullName || '—')}
        ${row('Status', '<span class="badge badge-success">SUBMITTED</span>')}
        ${row('Submitted At', fmt(request.submittedAt))}
      </table>
    </div>
    <p><strong>Documents Received:</strong></p>
    ${docChecklist(request.documents, [])}
    <p>Please log in to the admin panel to review this request.</p>
  `);
  return sendEmail(to, subject, html);
};

/**
 * 2. Student — confirmation email when fully submitted
 */
const notifyStudentSubmitted = async (request, studentEmail) => {
  const subject = `Application Submitted Successfully — ${request.applicationNumber}`;
  const html    = getBaseTemplate(subject, 'Your Postal Request is Submitted', `
    <p>Dear ${request.formData?.fullName || 'Student'},</p>
    <p>Your postal request has been <strong>submitted successfully</strong> with all required documents.</p>
    <div class="table-container">
      <table class="detail-table">
        ${row('Application Number', `<strong>${request.applicationNumber}</strong>`)}
        ${row('Status', '<span class="badge badge-success">SUBMITTED</span>')}
        ${row('Submitted At', fmt(request.submittedAt))}
      </table>
    </div>
    <div class="alert-box alert-success">
      ✅ All required documents have been received. Your application is now under review by the Registry Office.
    </div>
    <p>You will be notified once your request is processed. Please keep your application number for reference.</p>
  `);
  return sendEmail(studentEmail, subject, html);
};

/**
 * 3. Admin — application submitted with missing documents
 */
const notifyAdminPending = async (request, studentEmail) => {
  const to      = process.env.ADMIN_EMAIL || 'admin@utamed.com';
  const subject = `[PENDING] Postal Request With Missing Documents — ${request.applicationNumber}`;
  const deadlineMinutes = parseInt(process.env.DOCUMENT_DEADLINE_MINUTES) || 5;
  const html    = getBaseTemplate(subject, 'Postal Request — Documents Pending', `
    <p>Hello Admin,</p>
    <p>A new postal request has been submitted, but <strong>one or more required documents are missing</strong>.</p>
    <div class="table-container">
      <table class="detail-table">
        ${row('Application Number', `<strong>${request.applicationNumber}</strong>`)}
        ${row('Student Email', studentEmail)}
        ${row('Full Name', request.formData?.fullName || '—')}
        ${row('Phone', request.formData?.phone || '—')}
        ${row('Program', request.formData?.programName || '—')}
        ${row('Roll Number', request.formData?.rollNumber || '—')}
        ${row('Status', '<span class="badge">DOCUMENT PENDING</span>')}
        ${row('Document Deadline', fmt(request.documentDeadline))}
      </table>
    </div>
    <p><strong>Missing Documents (${request.missingDocuments.length} of 3):</strong></p>
    ${missingDocsList(request.missingDocuments)}
    <p><strong>Documents Checklist:</strong></p>
    ${docChecklist(request.documents, request.missingDocuments)}
    <div class="alert-box alert-warning">
      ⚠️ The student has <strong>${deadlineMinutes} minutes</strong> to upload the missing documents before this application expires.
    </div>
  `);
  return sendEmail(to, subject, html);
};

/**
 * 4. Student — notification about pending documents with deadline
 */
const notifyStudentPending = async (request, studentEmail) => {
  const deadlineMinutes = parseInt(process.env.DOCUMENT_DEADLINE_MINUTES) || 5;
  const subject = `Action Required — Upload Missing Documents — ${request.applicationNumber}`;
  const html    = getBaseTemplate(subject, 'Documents Pending — Action Required', `
    <p>Dear ${request.formData?.fullName || 'Student'},</p>
    <p>Your postal request has been received, but <strong>some required documents are missing</strong>. You must upload them before the deadline.</p>
    <div class="table-container">
      <table class="detail-table">
        ${row('Application Number', `<strong>${request.applicationNumber}</strong>`)}
        ${row('Status', '<span class="badge">DOCUMENT PENDING</span>')}
        ${row('Upload Deadline', `<strong style="color:#b45309">${fmt(request.documentDeadline)}</strong>`)}
        ${row('Time Allowed', `${deadlineMinutes} minutes from submission`)}
      </table>
    </div>
    <div class="alert-box alert-warning">
      ⚠️ You have <strong>${deadlineMinutes} minutes</strong> to upload the following missing documents. After the deadline, your application will expire automatically.
    </div>
    <p><strong>Missing Documents:</strong></p>
    ${missingDocsList(request.missingDocuments)}
    <p>To upload your documents, visit the postal request status page and enter your email address.</p>
  `);
  return sendEmail(studentEmail, subject, html);
};

/**
 * 5. Admin — all pending docs uploaded, status now SUBMITTED
 */
const notifyAdminDocsUploaded = async (request, studentEmail) => {
  const to      = process.env.ADMIN_EMAIL || 'admin@utamed.com';
  const subject = `[COMPLETED] All Documents Received — ${request.applicationNumber}`;
  const html    = getBaseTemplate(subject, 'Pending Documents Uploaded — Application Complete', `
    <p>Hello Admin,</p>
    <p>The student has uploaded all missing documents for application <strong>${request.applicationNumber}</strong>. The application is now fully submitted.</p>
    <div class="table-container">
      <table class="detail-table">
        ${row('Application Number', `<strong>${request.applicationNumber}</strong>`)}
        ${row('Student Email', studentEmail)}
        ${row('Full Name', request.formData?.fullName || '—')}
        ${row('Status', '<span class="badge badge-success">SUBMITTED</span>')}
        ${row('Submitted At', fmt(request.submittedAt))}
      </table>
    </div>
    <p><strong>All Documents Confirmed:</strong></p>
    ${docChecklist(request.documents, [])}
  `);
  return sendEmail(to, subject, html);
};

/**
 * 6. Student — all pending docs uploaded successfully
 */
const notifyStudentDocsUploaded = async (request, studentEmail) => {
  const subject = `All Documents Received — Application Submitted — ${request.applicationNumber}`;
  const html    = getBaseTemplate(subject, 'Your Application is Now Complete', `
    <p>Dear ${request.formData?.fullName || 'Student'},</p>
    <p>You have successfully uploaded all pending documents for your postal request.</p>
    <div class="table-container">
      <table class="detail-table">
        ${row('Application Number', `<strong>${request.applicationNumber}</strong>`)}
        ${row('Status', '<span class="badge badge-success">SUBMITTED</span>')}
        ${row('Completed At', fmt(request.submittedAt))}
      </table>
    </div>
    <div class="alert-box alert-success">
      ✅ All documents received. Your application is now under review by the Registry Office.
    </div>
  `);
  return sendEmail(studentEmail, subject, html);
};

/**
 * 7. Admin — application expired
 */
const notifyAdminExpired = async (request, studentEmail) => {
  const to      = process.env.ADMIN_EMAIL || 'admin@utamed.com';
  const subject = `[EXPIRED] Postal Request Expired — ${request.applicationNumber}`;
  const html    = getBaseTemplate(subject, 'Application Expired — Documents Not Uploaded', `
    <p>Hello Admin,</p>
    <p>The postal request <strong>${request.applicationNumber}</strong> has <strong>expired</strong> because the student did not upload the required documents within the allowed time.</p>
    <div class="table-container">
      <table class="detail-table">
        ${row('Application Number', `<strong>${request.applicationNumber}</strong>`)}
        ${row('Student Email', studentEmail)}
        ${row('Full Name', request.formData?.fullName || '—')}
        ${row('Status', '<span class="badge badge-danger">EXPIRED</span>')}
        ${row('Deadline Was', fmt(request.documentDeadline))}
        ${row('Expired At', fmt(request.expiredAt))}
      </table>
    </div>
    <p><strong>Documents that were never uploaded:</strong></p>
    ${missingDocsList(request.missingDocuments)}
    <p>No further action is required unless the student contacts the office directly.</p>
  `);
  return sendEmail(to, subject, html);
};

/**
 * 8. Student — application expired
 */
const notifyStudentExpired = async (request, studentEmail) => {
  const subject = `Application Expired — ${request.applicationNumber}`;
  const html    = getBaseTemplate(subject, 'Your Application Has Expired', `
    <p>Dear ${request.formData?.fullName || 'Student'},</p>
    <p>Unfortunately, your postal request application has <strong>expired</strong> because the required documents were not uploaded before the deadline.</p>
    <div class="table-container">
      <table class="detail-table">
        ${row('Application Number', `<strong>${request.applicationNumber}</strong>`)}
        ${row('Status', '<span class="badge badge-danger">EXPIRED</span>')}
        ${row('Deadline Was', fmt(request.documentDeadline))}
        ${row('Expired At', fmt(request.expiredAt))}
      </table>
    </div>
    <div class="alert-box alert-danger">
      🛑 <strong>Deadline expired.</strong> The missing documents were not uploaded within the required time window.
    </div>
    <p><strong>Missing Documents (not uploaded):</strong></p>
    ${missingDocsList(request.missingDocuments)}
    <p>Please contact the Registry Office or submit a new postal request if you still require this service.</p>
  `);
  return sendEmail(studentEmail, subject, html);
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  notifyAdminSubmitted,
  notifyStudentSubmitted,
  notifyAdminPending,
  notifyStudentPending,
  notifyAdminDocsUploaded,
  notifyStudentDocsUploaded,
  notifyAdminExpired,
  notifyStudentExpired
};
