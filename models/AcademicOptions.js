/**
 * AcademicOptions model — MySQL replacement for Mongoose AcademicOptions schema.
 *
 * The original MongoDB document was a SINGLETON object containing three arrays.
 * In MySQL these are stored in three flat tables. The API response shape is kept
 * identical:
 *   { departments: [...], programmes: [...], intakes: [...] }
 *
 * setOptions() replaces everything in a transaction (same as overwriting the
 * single Mongoose document).
 */
const db = require('../config/db');

// Default options that match the existing seeded values in the SQL schema
const DEFAULTS = {
  departments: ['Bachelor', 'Master', 'Doctorate'],
  programmes: [
    { department: 'Bachelor', programme: 'Bachelor in Education',                                   creditHours: '120 ECTS', price: '3,000 EUR', courseStartDate: '1 January 2027', courseEndDate: '1 July 2028' },
    { department: 'Bachelor', programme: "Bachelor's degree in Event and Hospitality Management",   creditHours: '180 ECTS', price: '3,000 EUR', courseStartDate: '1 July 2026',    courseEndDate: '1 July 2027' },
    { department: 'Master',   programme: 'Master of continuing Education in Public Administration', creditHours: '90 ECTS',  price: '4,000 EUR', courseStartDate: '1 July 2026',    courseEndDate: '1 July 2027' },
  ],
  intakes: [
    { department: 'Bachelor', programme: 'Bachelor in Education',                                   intake: 'January 2026 - July 2026' },
    { department: 'Bachelor', programme: "Bachelor's degree in Event and Hospitality Management",   intake: 'February 2026 - August 2026' },
    { department: 'Master',   programme: 'Master of continuing Education in Public Administration', intake: 'March 2026 - September 2026' },
  ],
};

/**
 * Read all three academic tables and assemble the single-object response.
 * Auto-seeds with defaults if the tables are empty.
 */
const getOptions = async () => {
  const [deptRows]  = await db.execute('SELECT name FROM academic_departments ORDER BY id ASC');
  const [progRows]  = await db.execute('SELECT department, programme, credit_hours, price, course_start_date, course_end_date FROM academic_programmes ORDER BY id ASC');
  const [intakeRows]= await db.execute('SELECT department, programme, intake FROM academic_intakes ORDER BY id ASC');

  // Auto-seed if completely empty
  if (deptRows.length === 0) {
    await setOptions(DEFAULTS.departments, DEFAULTS.programmes, DEFAULTS.intakes);
    return getOptions();
  }

  const departments = deptRows.map((r) => r.name);
  const programmes  = progRows.map((r) => ({
    department:      r.department,
    programme:       r.programme,
    creditHours:     r.credit_hours,
    price:           r.price,
    courseStartDate: r.course_start_date,
    courseEndDate:   r.course_end_date,
  }));
  const intakes = intakeRows.map((r) => ({
    department: r.department,
    programme:  r.programme,
    intake:     r.intake,
  }));

  return { departments, programmes, intakes };
};

/**
 * Replace all academic data inside a transaction.
 * @param {string[]}  departments
 * @param {Object[]}  programmes  — { department, programme, creditHours, price, courseStartDate, courseEndDate }
 * @param {Object[]}  intakes     — { department, programme, intake }
 */
const setOptions = async (departments, programmes, intakes) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute('DELETE FROM academic_departments');
    await conn.execute('DELETE FROM academic_programmes');
    await conn.execute('DELETE FROM academic_intakes');

    for (const name of departments) {
      await conn.execute('INSERT INTO academic_departments (name) VALUES (?)', [name]);
    }

    for (const p of programmes) {
      await conn.execute(
        `INSERT INTO academic_programmes
           (department, programme, credit_hours, price, course_start_date, course_end_date)
         VALUES (?,?,?,?,?,?)`,
        [
          p.department     || '',
          p.programme      || '',
          p.creditHours    || '',
          p.price          || '',
          p.courseStartDate|| '',
          p.courseEndDate  || '',
        ]
      );
    }

    for (const i of intakes) {
      await conn.execute(
        'INSERT INTO academic_intakes (department, programme, intake) VALUES (?,?,?)',
        [i.department || '', i.programme || '', i.intake || '']
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return getOptions();
};

module.exports = { getOptions, setOptions };
