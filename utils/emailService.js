const nodemailer = require('nodemailer');

// SMTP Transporter factory — credentials read at send-time so dotenv is always loaded first
const getTransporter = () => nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use STARTTLS
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false // Avoid blockages from custom local DNS / firewall policies
  }
});

// Helper for professional email container CSS/HTML
const getBaseTemplate = (title, contentHeader, contentBody) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      border: 1px border-solid #e2e8f0;
    }
    .header {
      background-color: #9B1C31; /* uniboRed branding */
      padding: 35px 40px;
      text-align: center;
      border-bottom: 4px solid #721422;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header p {
      color: #fca5a5;
      margin: 5px 0 0 0;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .content {
      padding: 40px;
    }
    .content h2 {
      margin-top: 0;
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.3;
    }
    .content p {
      font-size: 15px;
      line-height: 1.6;
      color: #475569;
      margin-bottom: 24px;
    }
    .divider {
      height: 1px;
      background-color: #f1f5f9;
      margin: 30px 0;
    }
    .table-container {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 24px;
    }
    .detail-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    .detail-table th {
      background-color: #f8fafc;
      font-weight: 600;
      color: #475569;
      text-align: left;
      padding: 12px 16px;
      border-bottom: 1px solid #e2e8f0;
      width: 35%;
    }
    .detail-table td {
      padding: 12px 16px;
      border-bottom: 1px solid #e2e8f0;
      color: #0f172a;
      word-break: break-word;
    }
    .detail-table tr:last-child th,
    .detail-table tr:last-child td {
      border-bottom: none;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      background-color: #fef3c7;
      color: #d97706;
      text-transform: uppercase;
    }
    .badge-success {
      background-color: #dcfce7;
      color: #15803d;
    }
    .button-container {
      text-align: center;
      margin: 35px 0 10px 0;
    }
    .btn {
      display: inline-block;
      background-color: #9B1C31;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 28px;
      font-size: 14px;
      font-weight: 700;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(155, 28, 49, 0.2);
      transition: background-color 0.2s ease;
    }
    .footer {
      background-color: #f8fafc;
      padding: 30px 40px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      line-height: 1.5;
    }
    .footer a {
      color: #9B1C31;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>UTAMED University</h1>
        <p>Admissions & Enrollment Hub</p>
      </div>
      <div class="content">
        <h2>${contentHeader}</h2>
        ${contentBody}
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} UTAMED University. All rights reserved.</p>
        <p>Institute UTAMED Academic Admissions Portal</p>
        <p>Need support? Please email us at <a href="mailto:support@utamed.com">support@utamed.com</a></p>
      </div>
    </div>
  </div>
</body>
</html>
`;

/**
 * 1 & 2. Send emails upon Application Submission
 * Both emails send concurrently.
 */
const sendSubmissionEmails = async (app) => {
  console.log(`[SMTP] sendSubmissionEmails called for application ID: ${app._id}`);
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@utamed.com';
  const mailerUser = process.env.EMAIL_USER || 'mailer@utamed.com';

  // Check if this is a pending documents application or a complete submission
  const isPendingDocuments = app.status === 'PendingDocuments';

  // Email to USER
  const userHtml = getBaseTemplate(
    'Application Submitted — UTAMED University',
    isPendingDocuments ? 'Application Received — Documents Required' : 'Application Received Successfully',
    `
    <p>Dear <strong>${app.fullName}</strong>,</p>
      ${isPendingDocuments ? `
      <p>⏰ IMPORTANT: Your application is incomplete. Missing documents detected.</p>
      <p>Your documents are currently pending. Please note that you have exactly <strong>2 months</strong> from the date of submission to upload your required documents.</p>
      <p>Missing: ${app.missingDocuments?.join(', ') || 'Documents'}</p>
      <p><strong style="color: #d32f2f;">Upload Deadline: ${new Date(app.documentDeadline).toLocaleString()}</strong></p>
      <div class="button-container">
        <a href="${app.uploadLink}" class="btn">Upload Documents Now</a>
      </div>
      ` : ''}
    <p>Thank you for submitting your application to the <strong>${app.programme}</strong> program within the <strong>${app.department}</strong> department.</p>
    <p>We are pleased to inform you that your application has been successfully submitted and is currently <strong>under review</strong> by our Registry Office evaluation committee.</p>
    <div class="divider"></div>
    <p>Here are your submission details for your records:</p>
    <div class="table-container">
      <table class="detail-table">
        <tr>
          <th>Application ID</th>
          <td>${app._id}</td>
        </tr>
        <tr>
          <th>Program</th>
          <td>${app.programme}</td>
        </tr>
        <tr>
          <th>Department</th>
          <td>${app.department}</td>
        </tr>
        <tr>
          <th>Submission Date</th>
          <td>${new Date(app.submissionDate).toLocaleDateString()}</td>
        </tr>
        <tr>
          <th>Status</th>
          <td><span class="badge">Pending Review</span></td>
        </tr>
      </table>
    </div>
    <p>We will contact you via email as soon as a decision is made or if additional documentation is required.</p>
    `
  );

  // Email to ADMIN
  const adminHtml = getBaseTemplate(
    'New Application Received — UTAMED University',
    'New Directory Submission Alert',
    `
    <p>Hello Admin,</p>
    <p>A new student application has been submitted to the directory. Please review the submitted details below:</p>
    <div class="divider"></div>
    <h3 style="color: #0f172a; margin-bottom: 12px; font-size: 16px;">Action Required</h3>
    <p><strong>Document Upload Link:</strong> <a href="${app.uploadLink}">${app.uploadLink}</a></p>
    <h3 style="color: #0f172a; margin-bottom: 12px; font-size: 16px;">Personal Information</h3>
    <div class="table-container">
      <table class="detail-table">
        <tr>
          <th>Full Name</th>
          <td>${app.fullName}</td>
        </tr>
        <tr>
          <th>Certificate Name</th>
          <td>${app.certificateName}</td>
        </tr>
        <tr>
          <th>Date of Birth</th>
          <td>${app.dob ? new Date(app.dob).toLocaleDateString() : 'N/A'}</td>
        </tr>
        <tr>
          <th>Gender</th>
          <td>${app.gender}</td>
        </tr>
        <tr>
          <th>Email Address</th>
          <td><a href="mailto:${app.email}">${app.email}</a></td>
        </tr>
        <tr>
          <th>Phone Number</th>
          <td>${app.phone}</td>
        </tr>
        <tr>
          <th>Passport Number</th>
          <td>${app.passportNumber}</td>
        </tr>
        <tr>
          <th>Country of Origin</th>
          <td>${app.country}</td>
        </tr>
        <tr>
          <th>Address</th>
          <td>${app.address}</td>
        </tr>
      </table>
    </div>

    <h3 style="color: #0f172a; margin-top: 30px; margin-bottom: 12px; font-size: 16px;">Academic Details</h3>
    <div class="table-container">
      <table class="detail-table">
        <tr>
          <th>Department</th>
          <td>${app.department}</td>
        </tr>
        <tr>
          <th>Course/Programme</th>
          <td>${app.programme}</td>
        </tr>
        <tr>
          <th>Start / End Date</th>
          <td>${app.courseStartDate || 'N/A'} - ${app.courseEndDate || 'N/A'}</td>
        </tr>
        <tr>
          <th>Intake Period</th>
          <td>${app.intake || 'N/A'}</td>
        </tr>
        <tr>
          <th>Credit Hours / Price</th>
          <td>${app.creditHours || '0'} hrs / ${app.price || 'N/A'}</td>
        </tr>
        <tr>
          <th>Highest Qualification</th>
          <td>${app.highestQualification}</td>
        </tr>
        <tr>
          <th>Via Approved Centre?</th>
          <td>${app.registrationViaCentre}</td>
        </tr>
        ${app.registrationViaCentre === 'Yes' ? `
        <tr>
          <th>Centre Name</th>
          <td>${app.centreName}</td>
        </tr>
        <tr>
          <th>Centre Email / Phone</th>
          <td>${app.centreEmail} / ${app.centrePhone}</td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    <div class="button-container">
      <a href="${process.env.VITE_API_URL || 'http://localhost:5000'}/admin" class="btn">Access registry Dashboard</a>
    </div>
    `
  );

  const stripHtml = (html) => html.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();

  const userMailOptions = {
    from: '"UTAMED Admissions" <' + mailerUser + '>',
    to: app.email,
    subject: isPendingDocuments ? 'Action Required: Upload Your Documents – UTAMED Admissions' : 'Application Submitted – UTAMED Admissions',
    html: userHtml,
    text: stripHtml(userHtml),
    replyTo: 'support@utamed.com',
    headers: {
      'X-Priority': '3',
      'X-Mailer': 'UTAMED Admissions Portal'
    }
  };

  const adminMailOptions = {
    from: '"UTAMED Admissions" <' + mailerUser + '>',
    to: adminEmail,
    subject: 'New Application Received – UTAMED Admissions',
    html: adminHtml,
    text: stripHtml(adminHtml),
    replyTo: 'support@utamed.com',
    headers: {
      'X-Priority': '3',
      'X-Mailer': 'UTAMED Admissions Portal'
    }
  };

  // Perform simultaneous email transmission
  console.log(`[SMTP] Sending submission emails concurrently to user (${app.email}) and admin (${adminEmail})...`);
  
  // Wrap sending in a try/catch. Use Promise.all to send simultaneously.
  const transporter = getTransporter();
  try {
    await Promise.all([
      transporter.sendMail(userMailOptions),
      transporter.sendMail(adminMailOptions)
    ]);
    console.log('[SMTP] Submission emails successfully delivered.');
    return { success: true };
  } catch (err) {
    console.error('[SMTP ERROR] Failed to send submission emails:', err.message);
    throw err; // propagate up to let router handle or log it
  }
};

/**
 * 3, 4 & 5. Send emails upon Application Approval (through Approved Center)
 * All 3 emails send concurrently.
 */
const sendApprovalEmails = async (app) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@utamed.com';
  const mailerUser = process.env.EMAIL_USER || 'mailer@utamed.com';

  // Email to USER
  const userHtml = getBaseTemplate(
    'Application Approved — UTAMED University',
    'Congratulations! Your Application is Approved',
    `
    <p>Dear <strong>${app.fullName}</strong>,</p>
    <p>We are absolutely thrilled to congratulate you! Your application for the <strong>${app.programme}</strong> program has been officially **Approved**.</p>
    <p>Your academic profile met our high standards of quality, and we are excited to welcome you into our community.</p>
    
    <div class="divider"></div>
    
    <p>Since your registration is processed through our regional partner network, your profile has been assigned to the following authorized center for final onboarding and local support:</p>
    <div class="table-container">
      <table class="detail-table">
        <tr>
          <th>Assigned Centre</th>
          <td><strong>${app.centreName || 'Authorized Partner Centre'}</strong></td>
        </tr>
        <tr>
          <th>Centre Contact Email</th>
          <td><a href="mailto:${app.centreEmail}">${app.centreEmail}</a></td>
        </tr>
        <tr>
          <th>Centre Contact Phone</th>
          <td>${app.centrePhone || 'N/A'}</td>
        </tr>
      </table>
    </div>
    
    <p>A representative from the assigned center will contact you shortly with the enrollment schedule, orientation details, and fee payment instructions. You may also contact them directly using the credentials listed above.</p>
    <p>Welcome to UTAMED University. We wish you an exceptional academic journey!</p>
    `
  );

  // Email to ADMIN
  const adminHtml = getBaseTemplate(
    'Application Approved — UTAMED University',
    'Application Approved & Assigned successfully',
    `
    <p>Hello Admin,</p>
    <p>This is to confirm that the application for <strong>${app.fullName}</strong> (ID: ${app._id}) has been successfully approved.</p>
    <p>The student profile has been automatically assigned to **${app.centreName || 'the approved center'}**.</p>
    
    <div class="divider"></div>
    
    <div class="table-container">
      <table class="detail-table">
        <tr>
          <th>Applicant Name</th>
          <td>${app.fullName}</td>
        </tr>
        <tr>
          <th>Assigned Centre</th>
          <td>${app.centreName}</td>
        </tr>
        <tr>
          <th>Centre Coordinator Email</th>
          <td>${app.centreEmail}</td>
        </tr>
        <tr>
          <th>Status</th>
          <td><span class="badge badge-success">Approved / Accepted</span></td>
        </tr>
      </table>
    </div>
    <p>All stakeholder notifications (User and Assigned Centre) have been simultaneously dispatched.</p>
    `
  );

  // Email to APPROVED CENTER
  const centerHtml = getBaseTemplate(
    'New Application Assigned — UTAMED University',
    'New Approved Student Profile Assigned',
    `
    <p>Dear Center Coordinator at <strong>${app.centreName}</strong>,</p>
    <p>We are writing to inform you that a new approved applicant has been assigned to your authorized center. Please review the student's profile information below to initiate final onboarding, schedule orientation, and collect local credentials:</p>
    
    <div class="divider"></div>
    
    <div class="table-container">
      <table class="detail-table">
        <tr>
          <th>Student Name</th>
          <td><strong>${app.fullName}</strong></td>
        </tr>
        <tr>
          <th>Student Email Address</th>
          <td><a href="mailto:${app.email}">${app.email}</a></td>
        </tr>
        <tr>
          <th>Student Phone Number</th>
          <td>${app.phone}</td>
        </tr>
        <tr>
          <th>Country</th>
          <td>${app.country}</td>
        </tr>
        <tr>
          <th>Highest Qualification</th>
          <td>${app.highestQualification}</td>
        </tr>
        <tr>
          <th>Registered Program</th>
          <td>${app.programme}</td>
        </tr>
        <tr>
          <th>Department</th>
          <td>${app.department}</td>
        </tr>
        <tr>
          <th>Intake Term</th>
          <td>${app.intake || 'N/A'}</td>
        </tr>
      </table>
    </div>
    
    <p><strong>Action Required:</strong> Please reach out to <strong>${app.fullName}</strong> at your earliest convenience to complete their enrollment files, verify documentation, and process course registrations.</p>
    <p>Thank you for your continued partnership with UTAMED University.</p>
    `
  );

  const stripHtml = (html) => html.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();

  const userMailOptions = {
    from: '"UTAMED Admissions" <' + mailerUser + '>',
    to: app.email,
    subject: 'Application Approved – UTAMED Admissions',
    html: userHtml,
    text: stripHtml(userHtml),
    replyTo: 'support@utamed.com',
    headers: {
      'X-Priority': '3',
      'X-Mailer': 'UTAMED Admissions Portal'
    }
  };

  const adminMailOptions = {
    from: '"UTAMED Admissions" <' + mailerUser + '>',
    to: adminEmail,
    subject: 'Application Approved – UTAMED Admissions',
    html: adminHtml,
    text: stripHtml(adminHtml),
    replyTo: 'support@utamed.com',
    headers: {
      'X-Priority': '3',
      'X-Mailer': 'UTAMED Admissions Portal'
    }
  };

  const centerMailOptions = {
    from: '"UTAMED Admissions" <' + mailerUser + '>',
    to: app.centreEmail,
    subject: 'New Application Assigned – UTAMED Admissions',
    html: centerHtml,
    text: stripHtml(centerHtml),
    replyTo: 'support@utamed.com',
    headers: {
      'X-Priority': '3',
      'X-Mailer': 'UTAMED Admissions Portal'
    }
  };

  // Perform simultaneous email transmissions for all 3 stakeholders
  console.log(`[SMTP] Sending approval emails concurrently to User (${app.email}), Admin (${adminEmail}), and Centre (${app.centreEmail})...`);
  
  const transporter = getTransporter();
  try {
    await Promise.all([
      transporter.sendMail(userMailOptions),
      transporter.sendMail(adminMailOptions),
      transporter.sendMail(centerMailOptions)
    ]);
    console.log('[SMTP] All 3 approval and assignment notifications delivered successfully.');
    return { success: true };
  } catch (err) {
    console.error('[SMTP ERROR] Failed to send approval emails:', err.message);
    throw err;
  }
};

/**
 * Notify student when application deadline expires
 */
const notifyStudentApplicationExpired = async (app) => {
  const missingDocsStr = app.missingDocuments?.length > 0 
    ? app.missingDocuments.map(d => `• ${d}`).join('\n')
    : 'Unknown';

  const html = getBaseTemplate(
    'Application Document Submission Expired',
    'Document Submission Period Expired',
    `
    <p>Dear ${app.fullName},</p>
    <p style="color: #d32f2f; font-weight: 600;">Your 5-minute document submission period has expired.</p>
    <p>You submitted your application but the following documents were not uploaded within the required timeframe:</p>
    <pre style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; overflow-x: auto;">
${missingDocsStr}
    </pre>
    <p><strong>Application Status:</strong> <span style="color: #d32f2f;">Rejected</span></p>
    <p>If you believe this is a mistake or need assistance, please contact our admissions office.</p>
    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-weight: 600; color: #856404;">Need Help?</p>
      <p style="margin: 8px 0 0 0; color: #856404;">Please contact: admissions@institution.com</p>
    </div>
    `
  );

  const stripHtml = (html) => html.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();

  const mailOptions = {
    from: '"UTAMED Admissions" <' + process.env.EMAIL_USER + '>',
    to: app.email,
    subject: 'Action Required: Document Submission Period Expired – UTAMED Application',
    html,
    text: stripHtml(html),
    replyTo: 'support@utamed.com',
    headers: {
      'X-Priority': '3',
      'X-Mailer': 'UTAMED Application Portal'
    }
  };

  const transporter = getTransporter();
  try {
    await transporter.sendMail(mailOptions);
    console.log(`[SMTP] Student expiration email sent to ${app.email}`);
  } catch (err) {
    console.error('[SMTP ERROR] Failed to send student expiration email:', err.message);
    throw err;
  }
};

/**
 * Notify admin when application deadline expires
 */
const notifyAdminApplicationExpired = async (app) => {
  const missingDocsStr = app.missingDocuments?.length > 0 
    ? app.missingDocuments.map(d => `• ${d}`).join('\n')
    : 'Unknown';

  const html = getBaseTemplate(
    'Application Document Submission Expired',
    'Application Deadline Expired - Admin Notification',
    `
    <p>An application has expired due to incomplete document submission.</p>
    <p><strong>Applicant:</strong> ${app.fullName}</p>
    <p><strong>Email:</strong> ${app.email}</p>
    <p><strong>Programme:</strong> ${app.programme}</p>
    <p><strong>Status:</strong> <span style="color: #d32f2f;">Rejected (Expired)</span></p>
    <p><strong>Missing Documents:</strong></p>
    <pre style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; overflow-x: auto;">
${missingDocsStr}
    </pre>
    <p><strong>Expiration Time:</strong> ${app.expiredAt?.toLocaleString() || 'N/A'}</p>
    `
  );

  const stripHtml = (html) => html.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();

  const mailOptions = {
    from: '"UTAMED Admissions" <' + process.env.EMAIL_USER + '>',
    to: 'saimhassantariq0003@gmail.com',
    subject: 'Application Deadline Expired – UTAMED Application',
    html,
    text: stripHtml(html),
    replyTo: 'support@utamed.com',
    headers: {
      'X-Priority': '3',
      'X-Mailer': 'UTAMED Application Portal'
    }
  };

  const transporter = getTransporter();
  try {
    await transporter.sendMail(mailOptions);
    console.log('[SMTP] Admin expiration email sent');
  } catch (err) {
    console.error('[SMTP ERROR] Failed to send admin expiration email:', err.message);
    throw err;
  }
};

const verifySMTPConnection = async () => {
  const transporter = getTransporter();
  try {
    await transporter.verify();
    console.log('[SMTP] Connection verified successfully. Ready to send emails.');
  } catch (err) {
    console.error('[SMTP ERROR] Failed to verify SMTP connection details:', err);
  }
};

/**
 * Send confirmation email to student and notification to admin when documents are uploaded successfully
 */
const sendDocumentUploadConfirmationEmails = async (app) => {
  console.log(`[SMTP] sendDocumentUploadConfirmationEmails called for application ID: ${app._id}`);
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@utamed.com';
  const mailerUser = process.env.EMAIL_USER || 'mailer@utamed.com';
  const serverUrl = process.env.VITE_API_URL || 'http://localhost:5000';

  // Email to USER
  const userHtml = getBaseTemplate(
    'Documents Uploaded Successfully — UTAMED University',
    'Documents Uploaded Successfully',
    `
    <p>Dear <strong>${app.fullName}</strong>,</p>
    <p>We are pleased to inform you that you have successfully uploaded all the required documents for your application to the <strong>${app.programme}</strong> program.</p>
    <p>Your application is now complete and is under review by our Registry Office evaluation committee.</p>
    <div class="divider"></div>
    <p>Here are your updated submission details for your records:</p>
    <div class="table-container">
      <table class="detail-table">
        <tr>
          <th>Application ID</th>
          <td>${app._id}</td>
        </tr>
        <tr>
          <th>Program</th>
          <td>${app.programme}</td>
        </tr>
        <tr>
          <th>Department</th>
          <td>${app.department}</td>
        </tr>
        <tr>
          <th>Submission Date</th>
          <td>${new Date(app.submissionDate).toLocaleDateString()}</td>
        </tr>
        <tr>
          <th>Status</th>
          <td><span class="badge badge-success">Submitted</span></td>
        </tr>
      </table>
    </div>
    <p>We will contact you via email as soon as a decision is made.</p>
    `
  );

  // Email to ADMIN
  const adminHtml = getBaseTemplate(
    'Updated Documents Received — UTAMED University',
    'Application Completed — Documents Uploaded',
    `
    <p>Hello Admin,</p>
    <p>The student <strong>${app.fullName}</strong> has successfully uploaded all the missing documents for application <strong>${app._id}</strong>. The application is now fully complete.</p>
    <div class="divider"></div>
    <h3 style="color: #0f172a; margin-bottom: 12px; font-size: 16px;">Uploaded Documents</h3>
    <div class="table-container">
      <table class="detail-table">
        <tr>
          <th>Profile Picture</th>
          <td>${app.profilePicture ? `<a href="${serverUrl}${app.profilePicture}" target="_blank">View File</a>` : 'Not Uploaded'}</td>
        </tr>
        <tr>
          <th>Passport Copy</th>
          <td>${app.passportCopy ? `<a href="${serverUrl}${app.passportCopy}" target="_blank">View File</a>` : 'Not Uploaded'}</td>
        </tr>
        <tr>
          <th>Resume / CV</th>
          <td>${app.resume ? `<a href="${serverUrl}${app.resume}" target="_blank">View File</a>` : 'Not Uploaded'}</td>
        </tr>
        <tr>
          <th>Transcript 1</th>
          <td>${app.transcript1 ? `<a href="${serverUrl}${app.transcript1}" target="_blank">View File</a>` : 'Not Uploaded'}</td>
        </tr>
        <tr>
          <th>Transcript 2</th>
          <td>${app.transcript2 ? `<a href="${serverUrl}${app.transcript2}" target="_blank">View File</a>` : 'N/A'}</td>
        </tr>
        <tr>
          <th>Transcript 3</th>
          <td>${app.transcript3 ? `<a href="${serverUrl}${app.transcript3}" target="_blank">View File</a>` : 'N/A'}</td>
        </tr>
      </table>
    </div>
    <div class="button-container">
      <a href="${serverUrl}/admin" class="btn">Access registry Dashboard</a>
    </div>
    `
  );

  const stripHtml = (html) => html.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();

  const userMailOptions = {
    from: '"UTAMED Admissions" <' + mailerUser + '>',
    to: app.email,
    subject: 'Documents Uploaded Successfully – UTAMED Admissions',
    html: userHtml,
    text: stripHtml(userHtml),
    replyTo: 'support@utamed.com',
    headers: {
      'X-Priority': '3',
      'X-Mailer': 'UTAMED Admissions Portal'
    }
  };

  const adminMailOptions = {
    from: '"UTAMED Admissions" <' + mailerUser + '>',
    to: adminEmail,
    subject: 'Updated Documents Received – UTAMED Admissions',
    html: adminHtml,
    text: stripHtml(adminHtml),
    replyTo: 'support@utamed.com',
    headers: {
      'X-Priority': '3',
      'X-Mailer': 'UTAMED Admissions Portal'
    }
  };

  console.log(`[SMTP] Sending upload confirmation emails concurrently to user (${app.email}) and admin (${adminEmail})...`);
  
  const transporter = getTransporter();
  try {
    await Promise.all([
      transporter.sendMail(userMailOptions),
      transporter.sendMail(adminMailOptions)
    ]);
    console.log('[SMTP] Upload confirmation emails successfully delivered.');
    return { success: true };
  } catch (err) {
    console.error('[SMTP ERROR] Failed to send upload confirmation emails:', err.message);
    throw err;
  }
};

module.exports = {
  sendSubmissionEmails,
  sendApprovalEmails,
  notifyStudentApplicationExpired,
  notifyAdminApplicationExpired,
  sendDocumentUploadConfirmationEmails,
  verifySMTPConnection
};
