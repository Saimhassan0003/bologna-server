/**
 * seed.js — Seeds the MySQL database with:
 *   1. A default admin account
 *   2. Default academic options (departments, programmes, intakes)
 *
 * Usage:  node seed.js
 *
 * Set the admin password via environment variable SEED_ADMIN_PASSWORD
 * (defaults to "admin123" — CHANGE THIS before deploying to production).
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const db     = require('./config/db');

const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL    || 'admissions@wto.utamed.university';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Utamed@2026$$';

const defaultDepartments = ['Bachelor', 'Master', 'Doctorate'];

const defaultProgrammes = [
  { department: 'Bachelor', programme: 'Bachelor in Education',                                   creditHours: '120 ECTS', price: '3,000 EUR', courseStartDate: '1 January 2027', courseEndDate: '1 July 2028' },
  { department: 'Bachelor', programme: "Bachelor's degree in Event and Hospitality Management",   creditHours: '180 ECTS', price: '3,000 EUR', courseStartDate: '1 July 2026',    courseEndDate: '1 July 2027' },
  { department: 'Master',   programme: 'Master of continuing Education in Public Administration', creditHours: '90 ECTS',  price: '4,000 EUR', courseStartDate: '1 July 2026',    courseEndDate: '1 July 2027' },
];

const defaultIntakes = [
  { department: 'Bachelor', programme: 'Bachelor in Education',                                   intake: 'January 2026 - July 2026' },
  { department: 'Bachelor', programme: "Bachelor's degree in Event and Hospitality Management",   intake: 'February 2026 - August 2026' },
  { department: 'Master',   programme: 'Master of continuing Education in Public Administration', intake: 'March 2026 - September 2026' },
];

const seed = async () => {
  console.log('🌱 Starting database seed...\n');

  try {
    // 1. Hash admin password
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // 2. Insert / update admin account
    await db.execute(
      `INSERT INTO admins (email, password)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE password = VALUES(password)`,
      [ADMIN_EMAIL, passwordHash]
    );
    console.log(`✅ Admin account seeded: ${ADMIN_EMAIL}`);

    // 3. Seed departments
    for (const name of defaultDepartments) {
      await db.execute(
        'INSERT IGNORE INTO academic_departments (name) VALUES (?)',
        [name]
      );
    }
    console.log(`✅ Departments seeded: ${defaultDepartments.join(', ')}`);

    // 4. Seed programmes
    for (const p of defaultProgrammes) {
      await db.execute(
        `INSERT INTO academic_programmes (department, programme, credit_hours, price, course_start_date, course_end_date)
         VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
           credit_hours      = VALUES(credit_hours),
           price             = VALUES(price),
           course_start_date = VALUES(course_start_date),
           course_end_date   = VALUES(course_end_date)`,
        [p.department, p.programme, p.creditHours, p.price, p.courseStartDate, p.courseEndDate]
      );
    }
    console.log(`✅ Programmes seeded: ${defaultProgrammes.length} records`);

    // 5. Seed intakes
    for (const i of defaultIntakes) {
      await db.execute(
        `INSERT IGNORE INTO academic_intakes (department, programme, intake)
         VALUES (?,?,?)`,
        [i.department, i.programme, i.intake]
      );
    }
    console.log(`✅ Intakes seeded: ${defaultIntakes.length} records`);

    console.log('\n🎉 Seed complete!\n');
    console.log(`   Admin email   : ${ADMIN_EMAIL}`);
    console.log(`   Admin password: ${ADMIN_PASSWORD}`);
    console.log('\n   ⚠️  Change the admin password after first login!\n');

  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    console.error(err.stack);
  } finally {
    process.exit(0);
  }
};

seed();
