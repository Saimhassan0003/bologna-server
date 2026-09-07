/**
 * PostalRequest model — MySQL replacement for Mongoose PostalRequest schema.
 *
 * The embedded `documents` array is stored in the child table
 * `postal_request_documents`. Before returning results we JOIN and re-assemble
 * the same nested shape the rest of the application expects:
 *   { id, _id, studentId, documents: [...], missingDocuments: [...], ... }
 */
const db = require('../config/db');

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Fetch the child documents for a given postal_request id.
 */
const fetchDocuments = async (postalRequestId) => {
  const [rows] = await db.execute(
    'SELECT * FROM postal_request_documents WHERE postal_request_id = ? ORDER BY uploaded_at ASC',
    [postalRequestId]
  );
  return rows.map((r) => ({
    _id:        r.id,
    name:       r.name,
    path:       r.path,
    uploadedAt: r.uploaded_at,
  }));
};

/**
 * Normalise a raw postal_requests row into the shape the app expects.
 * Accepts an optional pre-fetched documents array to avoid N+1 queries.
 */
const normalise = async (row, docs = null) => {
  if (!row) return null;
  const documents = docs !== null ? docs : await fetchDocuments(row.id);
  return {
    ...row,
    _id:             row.id,
    studentId:       row.student_id,
    applicationNumber: row.application_number,
    formData: {
      fullName:       row.form_full_name,
      fatherName:     row.form_father_name,
      phone:          row.form_phone,
      address:        row.form_address,
      passportOrCnic: row.form_passport_or_cnic,
      programName:    row.form_program_name,
      rollNumber:     row.form_roll_number,
    },
    documents,
    missingDocuments: typeof row.missing_documents === 'string'
      ? JSON.parse(row.missing_documents)
      : (row.missing_documents || []),
    documentDeadline:  row.document_deadline,
    submittedAt:       row.submitted_at,
    expiredAt:         row.expired_at,
    expiryEmailSent:   !!row.expiry_email_sent,
    createdAt:         row.created_at,
    updatedAt:         row.updated_at,
  };
};

// ─── Exported query functions ─────────────────────────────────────────────────

/**
 * Find a postal request by primary-key id (with its documents).
 */
const findById = async (id) => {
  const [rows] = await db.execute(
    'SELECT * FROM postal_requests WHERE id = ? LIMIT 1',
    [id]
  );
  if (!rows[0]) return null;
  return normalise(rows[0]);
};

/**
 * Find the latest postal request submitted by a student (by email).
 */
const findByStudentId = async (studentId) => {
  const [rows] = await db.execute(
    'SELECT * FROM postal_requests WHERE student_id = ? ORDER BY created_at DESC LIMIT 1',
    [studentId.trim().toLowerCase()]
  );
  if (!rows[0]) return null;
  return normalise(rows[0]);
};

/**
 * Track by studentId + applicationNumber (public tracking page).
 */
const findByTrack = async (studentId, applicationNumber) => {
  const [rows] = await db.execute(
    'SELECT * FROM postal_requests WHERE student_id = ? AND application_number = ? LIMIT 1',
    [studentId.trim().toLowerCase(), applicationNumber.trim()]
  );
  if (!rows[0]) return null;
  return normalise(rows[0]);
};

/**
 * Insert a new postal request (with optional documents).
 * @param {Object} data
 * @param {Object[]} data.documents — array of { name, path, uploadedAt }
 */
const create = async (data) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const missingDocs = JSON.stringify(data.missingDocuments || []);

    const [result] = await conn.execute(
      `INSERT INTO postal_requests (
        student_id, application_number,
        form_full_name, form_father_name, form_phone, form_address,
        form_passport_or_cnic, form_program_name, form_roll_number,
        missing_documents, status, document_deadline, submitted_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        (data.studentId || '').trim().toLowerCase(),
        data.applicationNumber,
        data.formData?.fullName       || '',
        data.formData?.fatherName     || '',
        data.formData?.phone          || '',
        data.formData?.address        || '',
        data.formData?.passportOrCnic || '',
        data.formData?.programName    || '',
        data.formData?.rollNumber     || '',
        missingDocs,
        data.status            || 'DOCUMENT_PENDING',
        data.documentDeadline  || null,
        data.submittedAt       || null,
      ]
    );

    const postalRequestId = result.insertId;

    // Insert child document rows
    for (const doc of (data.documents || [])) {
      await conn.execute(
        'INSERT INTO postal_request_documents (postal_request_id, name, path, uploaded_at) VALUES (?,?,?,?)',
        [postalRequestId, doc.name, doc.path, doc.uploadedAt || new Date()]
      );
    }

    await conn.commit();
    return findById(postalRequestId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

/**
 * Update a postal request and optionally insert new child document rows.
 * @param {number} id
 * @param {Object} updates         — flat camelCase fields to update on the parent row
 * @param {Object[]} [newDocuments] — new child document rows to INSERT
 */
const updateById = async (id, updates, newDocuments = []) => {
  const colMap = {
    status:           'status',
    documentDeadline: 'document_deadline',
    submittedAt:      'submitted_at',
    expiredAt:        'expired_at',
    expiryEmailSent:  'expiry_email_sent',
    missingDocuments: 'missing_documents',
  };

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const setClauses = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      const col = colMap[key];
      if (!col) continue;
      setClauses.push(`${col} = ?`);
      if (key === 'missingDocuments') {
        values.push(JSON.stringify(value));
      } else if (key === 'expiryEmailSent') {
        values.push(value ? 1 : 0);
      } else {
        values.push(value === undefined ? null : value);
      }
    }

    if (setClauses.length > 0) {
      values.push(id);
      await conn.execute(
        `UPDATE postal_requests SET ${setClauses.join(', ')} WHERE id = ?`,
        values
      );
    }

    for (const doc of newDocuments) {
      await conn.execute(
        'INSERT INTO postal_request_documents (postal_request_id, name, path, uploaded_at) VALUES (?,?,?,?)',
        [id, doc.name, doc.path, doc.uploadedAt || new Date()]
      );
    }

    await conn.commit();
    return findById(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

/**
 * Find all DOCUMENT_PENDING postal requests whose deadline has passed.
 * Used by the cron expiration job.
 */
const findExpired = async () => {
  const [rows] = await db.execute(
    `SELECT * FROM postal_requests
     WHERE status = 'DOCUMENT_PENDING'
       AND document_deadline IS NOT NULL
       AND document_deadline < NOW()`
  );
  // Normalise all rows (fetches child docs for each)
  return Promise.all(rows.map((r) => normalise(r)));
};

module.exports = {
  findById,
  findByStudentId,
  findByTrack,
  create,
  updateById,
  findExpired,
};
