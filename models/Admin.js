/**
 * Admin model — MySQL replacement for Mongoose Admin schema.
 * Exports plain async functions for all DB operations.
 */
const db = require('../config/db');

/**
 * Find an admin by email address.
 * @param {string} email
 * @returns {Object|null}
 */
const findByEmail = async (email) => {
  const [rows] = await db.execute(
    'SELECT * FROM admins WHERE email = ? LIMIT 1',
    [email]
  );
  return rows[0] || null;
};

/**
 * Find an admin by primary-key id.
 * @param {number} id
 * @returns {Object|null}
 */
const findById = async (id) => {
  const [rows] = await db.execute(
    'SELECT * FROM admins WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
};

/**
 * Insert a new admin record.
 * @param {string} email
 * @param {string} passwordHash  — bcrypt hash
 * @returns {Object} inserted row
 */
const create = async (email, passwordHash) => {
  const [result] = await db.execute(
    'INSERT INTO admins (email, password) VALUES (?, ?)',
    [email, passwordHash]
  );
  return { id: result.insertId, email };
};

module.exports = { findByEmail, findById, create };
