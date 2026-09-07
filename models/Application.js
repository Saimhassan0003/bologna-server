/**
 * Application model — MySQL replacement for Mongoose Application schema.
 *
 * All returned row objects include an `_id` alias pointing to `id` so that
 * existing frontend code (which uses `_id`) continues to work without any
 * React changes.
 *
 * Arrays stored as JSON columns (missing_documents) are automatically
 * parsed from strings back to JS arrays before being returned.
 */
const db = require('../config/db');

// ─── Internal helper ─────────────────────────────────────────────────────────

/**
 * Normalise a raw MySQL row into the shape the rest of the app expects.
 * Adds `_id` alias and parses JSON columns.
 */
const normalise = (row) => {
  if (!row) return null;
  return {
    ...row,
    // Backward-compat alias used by frontend and email service
    _id: row.id,
    // Parse JSON columns if they were returned as strings
    missingDocuments: typeof row.missing_documents === 'string'
      ? JSON.parse(row.missing_documents)
      : (row.missing_documents || []),
    // camelCase aliases for route/controller code
    firstName:                  row.first_name,
    lastName:                   row.last_name,
    fullName:                   row.full_name,
    certificateName:            row.certificate_name,
    referenceNumber:            row.reference_number,
    uniqueToken:                row.unique_token,
    passportNumber:             row.passport_number,
    courseStartDate:            row.course_start_date,
    courseEndDate:              row.course_end_date,
    creditHours:                row.credit_hours,
    registrationViaCentre:      row.registration_via_centre,
    centreName:                 row.centre_name,
    centreEmail:                row.centre_email,
    centrePhone:                row.centre_phone,
    highestQualification:       row.highest_qualification,
    profilePicture:             row.profile_picture,
    passportCopy:               row.passport_copy,
    submissionDate:             row.submission_date,
    documentDeadline:           row.document_deadline,
    documentSubmittedAt:        row.document_submitted_at,
    docsUploadedAt:             row.docs_uploaded_at,
    uploadLink:                 row.upload_link,
    rejectionReason:            row.rejection_reason,
    documentsUploadedCompleted: !!row.documents_uploaded_completed,
    expiryEmailSent:            !!row.expiry_email_sent,
    expiredAt:                  row.expired_at,
  };
};

// ─── Exported query functions ─────────────────────────────────────────────────

/**
 * Fetch all applications ordered by submission date descending.
 */
const findAll = async () => {
  const [rows] = await db.execute(
    'SELECT * FROM applications ORDER BY submission_date DESC'
  );
  return rows.map(normalise);
};

/**
 * Find a single application by primary-key id.
 */
const findById = async (id) => {
  const [rows] = await db.execute(
    'SELECT * FROM applications WHERE id = ? LIMIT 1',
    [id]
  );
  return normalise(rows[0]);
};

/**
 * Find a single application by email (case-insensitive).
 */
const findByEmail = async (email) => {
  const [rows] = await db.execute(
    'SELECT * FROM applications WHERE LOWER(email) = LOWER(?) LIMIT 1',
    [email]
  );
  return normalise(rows[0]);
};

/**
 * Insert a new application row.
 * @param {Object} data — camelCase fields matching the old Mongoose schema
 * @returns {Object} the newly inserted row (normalised)
 */
const create = async (data) => {
  const missingDocs = JSON.stringify(data.missingDocuments || []);

  const [result] = await db.execute(
    `INSERT INTO applications (
      first_name, last_name, full_name, certificate_name, dob, gender,
      email, reference_number, unique_token, phone, passport_number,
      country, address, department, programme, course_start_date, course_end_date,
      intake, credit_hours, price, registration_via_centre,
      centre_name, centre_email, centre_phone, highest_qualification,
      profile_picture, passport_copy, resume, transcript1, transcript2, transcript3,
      missing_documents, submission_date, document_deadline, upload_link,
      status, documents_uploaded_completed
    ) VALUES (
      ?,?,?,?,?,?,
      ?,?,?,?,?,
      ?,?,?,?,?,?,
      ?,?,?,?,
      ?,?,?,?,
      ?,?,?,?,?,?,
      ?,?,?,?,
      ?,?
    )`,
    [
      data.firstName         || '',
      data.lastName          || '',
      data.fullName,
      data.certificateName,
      data.dob,
      data.gender,
      data.email,
      data.referenceNumber   || null,
      data.uniqueToken       || null,
      data.phone,
      data.passportNumber,
      data.country,
      data.address,
      data.department,
      data.programme,
      data.courseStartDate   || '',
      data.courseEndDate     || '',
      data.intake            || '',
      data.creditHours       || '',
      data.price             || '',
      data.registrationViaCentre || 'No',
      data.centreName        || '',
      data.centreEmail       || '',
      data.centrePhone       || '',
      data.highestQualification,
      data.profilePicture    || '',
      data.passportCopy      || '',
      data.resume            || '',
      data.transcript1       || '',
      data.transcript2       || '',
      data.transcript3       || '',
      missingDocs,
      data.submissionDate    || new Date(),
      data.documentDeadline  || null,
      data.uploadLink        || '',
      data.status            || 'Submitted',
      data.documentsUploadedCompleted ? 1 : 0,
    ]
  );

  return findById(result.insertId);
};

/**
 * Update specific fields on an existing application by id.
 * Accepts camelCase field names (maps to snake_case columns).
 * @param {number} id
 * @param {Object} updates — partial camelCase update map
 */
const updateById = async (id, updates) => {
  // Map camelCase keys to column names
  const colMap = {
    firstName:                  'first_name',
    lastName:                   'last_name',
    fullName:                   'full_name',
    certificateName:            'certificate_name',
    dob:                        'dob',
    gender:                     'gender',
    email:                      'email',
    referenceNumber:            'reference_number',
    uniqueToken:                'unique_token',
    phone:                      'phone',
    passportNumber:             'passport_number',
    country:                    'country',
    address:                    'address',
    department:                 'department',
    programme:                  'programme',
    courseStartDate:            'course_start_date',
    courseEndDate:              'course_end_date',
    intake:                     'intake',
    creditHours:                'credit_hours',
    price:                      'price',
    registrationViaCentre:      'registration_via_centre',
    centreName:                 'centre_name',
    centreEmail:                'centre_email',
    centrePhone:                'centre_phone',
    highestQualification:       'highest_qualification',
    profilePicture:             'profile_picture',
    passportCopy:               'passport_copy',
    resume:                     'resume',
    transcript1:                'transcript1',
    transcript2:                'transcript2',
    transcript3:                'transcript3',
    missingDocuments:           'missing_documents',
    submissionDate:             'submission_date',
    documentDeadline:           'document_deadline',
    documentSubmittedAt:        'document_submitted_at',
    docsUploadedAt:             'docs_uploaded_at',
    uploadLink:                 'upload_link',
    status:                     'status',
    rejectionReason:            'rejection_reason',
    documentsUploadedCompleted: 'documents_uploaded_completed',
    expiryEmailSent:            'expiry_email_sent',
    expiredAt:                  'expired_at',
  };

  const setClauses = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    const col = colMap[key];
    if (!col) continue; // skip unknown keys
    if (key === 'missingDocuments') {
      setClauses.push(`${col} = ?`);
      values.push(JSON.stringify(value));
    } else if (key === 'documentsUploadedCompleted' || key === 'expiryEmailSent') {
      setClauses.push(`${col} = ?`);
      values.push(value ? 1 : 0);
    } else {
      setClauses.push(`${col} = ?`);
      values.push(value === undefined ? null : value);
    }
  }

  if (setClauses.length === 0) return findById(id);

  values.push(id);
  await db.execute(
    `UPDATE applications SET ${setClauses.join(', ')} WHERE id = ?`,
    values
  );

  return findById(id);
};

/**
 * Find all DOCUMENT_PENDING applications whose deadline has passed.
 * Used by the cron expiration job.
 */
const findExpired = async () => {
  const [rows] = await db.execute(
    `SELECT * FROM applications
     WHERE status = 'PendingDocuments'
       AND document_deadline IS NOT NULL
       AND document_deadline < NOW()`
  );
  return rows.map(normalise);
};

module.exports = { findAll, findById, findByEmail, create, updateById, findExpired };