const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, 'assets');

// Helper to format Date
const formatDate = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
};

// Common function to draw footer
const drawFooter = (doc, isUK = false) => {
  const address = isUK
    ? "11 Regent Gate, 83 High Street, Waltham Cross, Hertfordshire, United Kingdom EN8 7AF"
    : "17-3 Jalan 8/1D, Section 8, 46050 Petaling Jaya, Selangor, Malaysia";
  const office = isUK
    ? "Office: +44(0) 787 871 6124 Web: www.studentportal.com"
    : "Office: +60 03-7955 5285 | Web: www.studentportal.com";

  const savedColor = doc._fillColor;
  doc.fontSize(8.5)
     .fillColor('#555555')
     .text(address, 50, doc.page.height - 65, { align: 'center', width: doc.page.width - 100 })
     .text(office, 50, doc.page.height - 50, { align: 'center', width: doc.page.width - 100 });
  if (savedColor) {
    doc.fillColor(savedColor);
  }
};

/**
 * 1. Generate Student Submission Confirmation PDF
 */
const generateStudentSubmissionPDF = (app, outputPath) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    const logoPath = path.join(ASSETS_DIR, 'logo_student_submission.jpg');

    // Logo
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, (doc.page.width - 160) / 2, 40, { width: 160 });
    }

    doc.y = 120; // set position after logo

    // Title / Subject
    doc.font('Helvetica-Bold')
       .fontSize(12)
       .fillColor('#000000')
       .text('Subject: Confirmation of Application Submission—Student Portal', 50, doc.y)
       .moveDown(1.5);

    // Salutation
    doc.font('Helvetica')
       .fontSize(10.5)
       .text('Dear Applicant,', 50, doc.y)
       .moveDown(1.2);

    // Body text
    doc.text('We are pleased to confirm that your application for a programme with Student Portal has been successfully received.', { lineGap: 4 })
       .moveDown(1.2);

    doc.text('Our admissions team is currently reviewing your submission. We will contact you shortly regarding the next steps of the enrolment process.', { lineGap: 4 })
       .moveDown(1.2);

    doc.text('Should you have any inquiries in the meantime, please do not hesitate to contact us. When reaching out, kindly include your full name and the name of the programme you have applied to ensure we can assist you promptly.', { lineGap: 4 })
       .moveDown(1.2);

    doc.text('Thank you for choosing Student Portal. We look forward to welcoming you to our academic community.', { lineGap: 4 })
       .moveDown(1.5);

    // Dynamic applicant details table/list
    doc.font('Helvetica-Bold')
       .fontSize(11)
       .text('Submitted Application Details:', 50, doc.y)
       .moveDown(0.6);

    const details = [
      { label: 'Application ID', value: String(app._id) },
      { label: 'Full Name', value: app.fullName || `${app.firstName || ''} ${app.lastName || ''}`.trim() },
      { label: 'Email Address', value: app.email },
      { label: 'Contact Number', value: app.phone },
      { label: 'Programme', value: app.programme },
      { label: 'Intake', value: app.intake || 'N/A' },
      { label: 'Submission Date', value: formatDate(app.submissionDate || new Date()) }
    ];

    doc.font('Helvetica')
       .fontSize(10);
    
    // Draw details with light grid alignment
    const labelX = 60;
    const valueX = 180;
    let currentY = doc.y;

    details.forEach(item => {
      doc.font('Helvetica-Bold').text(item.label + ':', labelX, currentY);
      doc.font('Helvetica').text(item.value, valueX, currentY);
      currentY += 18;
    });

    doc.y = currentY + 15;

    // Closing
    doc.font('Helvetica')
       .fontSize(10.5)
       .text('Sincerely,', 50, doc.y)
       .moveDown(0.5);

    doc.font('Helvetica-Bold')
       .text('Admissions Administration', 50, doc.y)
       .font('Helvetica')
       .text('Student Portal', 50, doc.y);

    // Footer at the bottom
    drawFooter(doc, false);

    doc.end();

    writeStream.on('finish', () => resolve(outputPath));
    writeStream.on('error', (err) => reject(err));
  });
};

/**
 * 2. Generate Admin Submission Notification PDF
 */
const generateAdminSubmissionPDF = (app, outputPath) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    const logoPath = path.join(ASSETS_DIR, 'logo_admin_submission.jpg');

    // Logo
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, (doc.page.width - 160) / 2, 40, { width: 160 });
    }

    doc.y = 120; // set position after logo

    // Heading
    doc.font('Helvetica-Bold')
       .fontSize(12)
       .fillColor('#000000')
       .text('To the Admissions Administration', 50, doc.y)
       .moveDown(1);

    doc.font('Helvetica')
       .fontSize(10.5)
       .text('This communication serves as formal notification regarding a recently submitted application for admission to Student Portal. Please find the applicant’s complete details below for your review:', { lineGap: 4 })
       .moveDown(1.5);

    // List of dynamic details as requested by user
    const details = [
      { label: 'Full Name', value: app.fullName || `${app.firstName || ''} ${app.lastName || ''}`.trim() },
      { label: 'Email', value: app.email },
      { label: 'Phone Number', value: app.phone },
      { label: 'Country', value: app.country },
      { label: 'Address', value: app.address },
      { label: 'Programme', value: app.programme },
      { label: 'Intake', value: app.intake || 'N/A' },
      { label: 'Application ID', value: String(app._id) },
      { label: 'Submission Date', value: formatDate(app.submissionDate || new Date()) },
      { label: 'Current Status', value: 'Pending' }
    ];

    const labelX = 60;
    const valueX = 180;
    let currentY = doc.y;

    details.forEach(item => {
      doc.font('Helvetica-Bold').fontSize(10).text(item.label + ':', labelX, currentY);
      doc.font('Helvetica').fontSize(10).text(item.value, valueX, currentY);
      currentY += 18;
    });

    doc.y = currentY + 20;

    doc.font('Helvetica')
       .fontSize(10.5)
       .text('We kindly request that you process this application at your earliest convenience.', { lineGap: 4 })
       .moveDown(1.5);

    // Closing
    doc.text('Sincerely,', 50, doc.y)
       .moveDown(0.5);

    doc.font('Helvetica-Bold')
       .text('Admissions Administration', 50, doc.y)
       .font('Helvetica')
       .text('Student Portal', 50, doc.y);

    // UK address footer for Admin submission
    drawFooter(doc, true);

    doc.end();

    writeStream.on('finish', () => resolve(outputPath));
    writeStream.on('error', (err) => reject(err));
  });
};

/**
 * 3. Generate Admission Letter PDF (2 pages)
 */
const generateAdmissionLetterPDF = (app, outputPath) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    const logoPath = path.join(ASSETS_DIR, 'logo_admission.jpg');
    const signaturePath = path.join(ASSETS_DIR, 'signature_admission.png');

    // PAGE 1
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, (doc.page.width - 160) / 2, 40, { width: 160 });
    }

    doc.y = 120; // set position after logo

    // Placeholders on Page 1
    const todayStr = formatDate(new Date());
    const studentName = app.fullName || `${app.firstName || ''} ${app.lastName || ''}`.trim();
    const studentAddress = app.address || 'N/A';
    const programmeName = app.programme || 'N/A';
    const commencementDate = app.courseStartDate ? formatDate(app.courseStartDate) : 'N/A';
    const studentId = app.referenceNumber || String(app._id);

    doc.font('Helvetica')
       .fontSize(10)
       .fillColor('#000000');

    doc.font('Helvetica-Bold').text('Date: ', 50, doc.y, { continued: true }).font('Helvetica').text(todayStr);
    doc.font('Helvetica-Bold').text('Student Name: ', 50, doc.y, { continued: true }).font('Helvetica').text(studentName);
    doc.font('Helvetica-Bold').text('Address: ', 50, doc.y, { continued: true }).font('Helvetica').text(studentAddress);
    doc.moveDown(1);

    doc.text(`Dear ${studentName},`, 50, doc.y)
       .moveDown(0.8);

    doc.font('Helvetica-Bold').text('Programme: ', 50, doc.y, { continued: true }).font('Helvetica').text(programmeName)
       .moveDown(1);

    doc.text('Congratulations! We are very pleased to inform you that you have been admitted to the programme at Student Portal. We welcome you to our world-class academic community and look forward to your contributions.', { lineGap: 4 })
       .moveDown(1.2);

    // Section 1
    doc.font('Helvetica-Bold')
       .text('1. Admission and Enrolment Details', 50, doc.y)
       .moveDown(0.5);

    doc.font('Helvetica')
       .text(`Access to your learning modules will be granted on commencement date (${commencementDate}) of your programme. Please utilize the login credentials previously forwarded to you. Your primary portal for learning materials, official notices and social engagement is `, { lineGap: 4, continued: true })
       .fillColor('#0000EE')
       .text('https://lms.studentportal.com', { link: 'https://lms.studentportal.com', underline: true })
       .fillColor('#000000')
       .moveDown(0.8);

    // Show portal login credentials details block if available
    doc.font('Helvetica-Bold').text('Portal Access Credentials:', 60, doc.y).moveDown(0.4);
    doc.font('Helvetica')
       .text(`• Student ID: ${studentId}`, 70, doc.y)
       .text(`• Portal Login URL: https://lms.studentportal.com`, 70, doc.y)
       .text(`• Username: ${app.email}`, 70, doc.y)
       .text(`• Temporary Password: Your phone number (${app.phone}) or default registration password`, 70, doc.y)
       .moveDown(1);

    // Section 2
    doc.font('Helvetica-Bold')
       .text('2. Academic Guidelines and Resources', 50, doc.y)
       .moveDown(0.5);

    doc.font('Helvetica')
       .text('Prior to the start of classes, we strongly recommend reviewing the Programme Specifications, Student Handbook, and Programme Hub. These essential documents are available within the portal.', { lineGap: 4 })
       .moveDown(0.8);

    doc.text('Students are expected to complete the programme within the designated course duration. Please be advised that tuition fees are non-refundable after fourteen (14) days from the programme’s commencement date.', { lineGap: 4 })
       .moveDown(0.8);

    doc.text('Official communications, including updates regarding assessments and examinations, will be posted on the online “Notice Board.” It is your sole responsibility to monitor this board regularly to remain informed of all academic requirements.', { lineGap: 4 })
       .moveDown(1);

    // Section 3
    doc.font('Helvetica-Bold')
       .text('3. Student Support and Collaborative Learning', 50, doc.y)
       .moveDown(0.5);

    doc.font('Helvetica')
       .text('Our mission is to provide a rigorous and enriching learning experience. Should you require assistance, our faculty and staff are available to support your academic journey. For inquiries, please use the dedicated query section on the student portal.', { lineGap: 4 });

    // PAGE 2
    doc.addPage();

    doc.font('Helvetica')
       .fontSize(10)
       .text('If you are studying at a collaborative Marketing Centre of Student Portal, please contact your Marketing Centre for your timetable and tuition fee arrangements.', 50, 40, { lineGap: 4 })
       .moveDown(1);

    // Section 4
    doc.font('Helvetica-Bold')
       .text('4. Academic Progression and Partner Institutions', 50, doc.y)
       .moveDown(0.5);

    doc.font('Helvetica')
       .text('Upon successful completion of all requirements, you will be awarded your formal qualification.', { lineGap: 4 })
       .moveDown(0.8);

    doc.text('If your curriculum involves partner University—either through progression or joint delivery—you will receive supplementary admission letter from that institution within 3-4 months of commencing the partner-specific phase of the programme.', { lineGap: 4 })
       .moveDown(0.8);

    doc.text('It is the students’ responsibility to ensure they satisfy the entry and progression criteria established by our Partner University, as governed by their respective academic regulations.', { lineGap: 4 })
       .moveDown(1);

    // Section 5
    doc.font('Helvetica-Bold')
       .text('5. Professional Disclaimer and Verification', 50, doc.y)
       .moveDown(0.5);

    doc.font('Helvetica')
       .text('Students are responsible for checking and verifying the suitability and acceptability of this qualification with relevant accrediting bodies, employers, or professional associations. This includes ensuring the qualification meets specific requirements for career advancement, professional licensure, or emigration purposes. As you embark on this rewarding academic journey, we extend our sincerest best wishes for your success. We are confident that your time with us will be both intellectually stimulating and professionally transformative, providing you with the foundation needed to achieve your future goals.', { lineGap: 4 })
       .moveDown(1.5);

    // Closing
    doc.text('Yours sincerely,', 50, doc.y)
       .moveDown(0.8);

    // Signature image placement
    if (fs.existsSync(signaturePath)) {
      const sigY = doc.y;
      doc.image(signaturePath, 50, sigY, { width: 90 });
      doc.y = sigY + 45; // move below signature image
    } else {
      doc.moveDown(2);
    }

    doc.font('Helvetica-Bold')
       .text('Chief Executive Officer', 50, doc.y);

    // Footer at bottom of Page 2
    drawFooter(doc, false);

    doc.end();

    writeStream.on('finish', () => resolve(outputPath));
    writeStream.on('error', (err) => reject(err));
  });
};

/**
 * 4. Generate Application Rejection PDF
 */
const generateRejectionLetterPDF = (app, outputPath, reason = '') => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    const logoPath = path.join(ASSETS_DIR, 'logo_rejection.jpg');
    const signaturePath = path.join(ASSETS_DIR, 'signature_rejection.png');

    // Logo
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, (doc.page.width - 160) / 2, 40, { width: 160 });
    }

    doc.y = 120; // set position after logo

    const dateStr = formatDate(new Date());
    const studentName = app.fullName || `${app.firstName || ''} ${app.lastName || ''}`.trim();
    const address = app.address || 'N/A';
    const postalCode = app.postalCode || ''; // (if available)
    const country = app.country || 'N/A';
    const programmeAndIntake = `${app.programme || 'N/A'} and ${app.intake || 'N/A'}`;

    doc.font('Helvetica')
       .fontSize(10)
       .fillColor('#000000');

    // Contact block
    doc.text(dateStr, 50, doc.y)
       .moveDown(0.8);

    doc.text(studentName, 50, doc.y);
    doc.text(address, 50, doc.y);
    if (postalCode) {
      doc.text(postalCode, 50, doc.y);
    }
    doc.text(country, 50, doc.y)
       .moveDown(1);

    doc.font('Helvetica-Bold')
       .text(`Intake: ${programmeAndIntake},`, 50, doc.y)
       .moveDown(1);

    doc.font('Helvetica')
       .text(`Dear ${studentName},`, 50, doc.y)
       .moveDown(1);

    doc.text('Following a comprehensive evaluation of your application by the Admissions Committee, we regret to inform you that we are unable to offer you admission to the Programme for the upcoming intake.', { lineGap: 4 })
       .moveDown(1.2);

    doc.text('The selection process was exceptionally competitive this year, and our decision in no way diminishes your significant academic accomplishment. We were impressed by your scholarly potential and are confident that your dedication will lead to success in your future intellectual pursuits. We appreciate the interest you have shown in our institution and wish you all the very best as you continue your academic career.', { lineGap: 4 })
       .moveDown(1.2);

    // Optional Rejection Reason if provided
    if (reason) {
      doc.font('Helvetica-Bold')
         .text('Reason for Rejection:', 50, doc.y)
         .moveDown(0.4);
      doc.font('Helvetica')
         .text(reason, 60, doc.y, { lineGap: 4 })
         .moveDown(1.5);
    }

    doc.text('Sincerely,', 50, doc.y)
       .moveDown(0.8);

    // Signature
    if (fs.existsSync(signaturePath)) {
      const sigY = doc.y;
      doc.image(signaturePath, 50, sigY, { width: 90 });
      doc.y = sigY + 45;
    } else {
      doc.moveDown(2);
    }

    doc.font('Helvetica-Bold')
       .text('Chief Executive Officer', 50, doc.y);

    // Footer at the bottom
    drawFooter(doc, false);

    doc.end();

    writeStream.on('finish', () => resolve(outputPath));
    writeStream.on('error', (err) => reject(err));
  });
};

module.exports = {
  generateStudentSubmissionPDF,
  generateAdminSubmissionPDF,
  generateAdmissionLetterPDF,
  generateRejectionLetterPDF
};
