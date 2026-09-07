/**
 * Centre model — MySQL replacement for Mongoose Centre schema.
 */
const db = require('../config/db');

const normalise = (row) => {
  if (!row) return null;
  return {
    ...row,
    _id: row.id,
    createdAt: row.created_at,
  };
};

/** Return all centres sorted by creation date descending. */
const findAll = async (sortBy = 'created_at', order = 'DESC') => {
  const allowedCols = ['created_at', 'name'];
  const col = allowedCols.includes(sortBy) ? sortBy : 'created_at';
  const dir = order === 'ASC' ? 'ASC' : 'DESC';
  const [rows] = await db.execute(
    `SELECT * FROM centres ORDER BY ${col} ${dir}`
  );
  return rows.map(normalise);
};

/** Return all centres sorted by name (for public dropdown). */
const findAllPublic = async () => {
  const [rows] = await db.execute(
    'SELECT id, name, email, phone FROM centres ORDER BY name ASC'
  );
  return rows.map(normalise);
};

/** Find a centre by primary-key id. */
const findById = async (id) => {
  const [rows] = await db.execute(
    'SELECT * FROM centres WHERE id = ? LIMIT 1',
    [id]
  );
  return normalise(rows[0]);
};

/** Find a centre by name (case-sensitive). */
const findByName = async (name) => {
  const [rows] = await db.execute(
    'SELECT * FROM centres WHERE name = ? LIMIT 1',
    [name]
  );
  return normalise(rows[0]);
};

/** Insert a new centre. */
const create = async ({ name, email, phone }) => {
  const [result] = await db.execute(
    'INSERT INTO centres (name, email, phone) VALUES (?, ?, ?)',
    [name, email || '', phone || '']
  );
  return findById(result.insertId);
};

/** Update a centre by id (only fields provided are changed). */
const updateById = async (id, updates) => {
  const setClauses = [];
  const values = [];
  if (updates.name  !== undefined) { setClauses.push('name = ?');  values.push(updates.name); }
  if (updates.email !== undefined) { setClauses.push('email = ?'); values.push(updates.email); }
  if (updates.phone !== undefined) { setClauses.push('phone = ?'); values.push(updates.phone); }
  if (setClauses.length === 0) return findById(id);
  values.push(id);
  await db.execute(
    `UPDATE centres SET ${setClauses.join(', ')} WHERE id = ?`,
    values
  );
  return findById(id);
};

/** Delete a centre by id. */
const deleteById = async (id) => {
  await db.execute('DELETE FROM centres WHERE id = ?', [id]);
};

module.exports = { findAll, findAllPublic, findById, findByName, create, updateById, deleteById };
