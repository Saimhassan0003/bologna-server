/**
 * ActivityLog model — MySQL replacement for Mongoose ActivityLog schema.
 */
const db = require('../config/db');

const normalise = (row) => {
  if (!row) return null;
  return {
    ...row,
    _id:         row.id,
    performedBy: row.performed_by,
  };
};

/**
 * Insert a new activity log entry.
 */
const create = async (action, description, category = 'general', performedBy = 'User') => {
  const [result] = await db.execute(
    `INSERT INTO activity_logs (action, description, category, performed_by)
     VALUES (?, ?, ?, ?)`,
    [action, description, category, performedBy]
  );
  return { id: result.insertId, action, description, category, performedBy };
};

/**
 * Return the most recent N logs ordered by timestamp descending.
 */
const findRecent = async (limit = 100) => {
  const [rows] = await db.execute(
    'SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT ?',
    [limit]
  );
  return rows.map(normalise);
};

/**
 * Delete all activity log entries.
 */
const deleteAll = async () => {
  await db.execute('DELETE FROM activity_logs');
};

module.exports = { create, findRecent, deleteAll };
