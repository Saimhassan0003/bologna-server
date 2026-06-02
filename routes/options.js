const express = require('express');
const router = express.Router();
const AcademicOptions = require('../models/AcademicOptions');
const authMiddleware = require('../middleware/authMiddleware');

// Get all customizable academic options (Departments, Programmes, Intakes)
// If empty, automatically seed with the initial default arrays
router.get('/', async (req, res) => {
  try {
    let options = await AcademicOptions.findOne();
    if (!options || !options.departments.includes('Bachelor') || !options.programmes.some(p => p.courseStartDate)) {
      if (options) {
        await AcademicOptions.deleteOne({ _id: options._id });
      }
      // Options matching the images
      options = new AcademicOptions({
        departments: [
          'Bachelor',
          'Master',
          'Doctorate'
        ],
        programmes: [
          { department: 'Bachelor', programme: 'Bachelor in Education', creditHours: '120 ECTS', price: '3,000 EUR', courseStartDate: '1 January 2027', courseEndDate: '1 July 2028' },
          { department: 'Bachelor', programme: "Bachelor's degree in Event and Hospitality Management", creditHours: '180 ECTS', price: '3,000 EUR', courseStartDate: '1 July 2026', courseEndDate: '1 July 2027' },
          { department: 'Master', programme: 'Master of continuing Education in Public Administration', creditHours: '90 ECTS', price: '4,000 EUR', courseStartDate: '1 July 2026', courseEndDate: '1 July 2027' }
        ],
        intakes: [
          { department: 'Bachelor', programme: 'Bachelor in Education', intake: 'January 2026 - July 2026' },
          { department: 'Bachelor', programme: "Bachelor's degree in Event and Hospitality Management", intake: 'February 2026 - August 2026' },
          { department: 'Master', programme: 'Master of continuing Education in Public Administration', intake: 'March 2026 - September 2026' }
        ]
      });
      await options.save();
    } else {
      // Automatic Migration Layer for legacy string programmes & intakes using raw document
      const rawDoc = await AcademicOptions.findOne().lean();
      
      let needsProgMigration = false;
      const migratedProgs = rawDoc.programmes.map((item) => {
        if (item && typeof item === 'object' && item.programme) {
          return item; // already in new format
        }
        needsProgMigration = true;
        return {
          department: rawDoc.departments[0] || 'Level 5 Higher Diploma',
          programme: typeof item === 'string' ? item : (item && item.programme ? item.programme : 'Executive Diploma in Marketing')
        };
      });

      if (needsProgMigration) {
        options.programmes = migratedProgs;
        await options.save();
      }

      let needsIntakeMigration = false;
      const migratedIntakes = rawDoc.intakes.map(item => {
        if (item && typeof item === 'object' && item.intake) {
          return item; // already in new format
        }
        needsIntakeMigration = true;
        const fallbackProg = migratedProgs[0] 
          ? (typeof migratedProgs[0] === 'object' ? migratedProgs[0].programme : migratedProgs[0]) 
          : 'Executive Diploma in Marketing';
        return {
          department: rawDoc.departments[0] || 'Level 5 Higher Diploma',
          programme: fallbackProg,
          intake: typeof item === 'string' ? item : (item && item.intake ? item.intake : 'January 2026 - July 2026')
        };
      });

      if (needsIntakeMigration) {
        options.intakes = migratedIntakes;
        await options.save();
      }
    }
    res.json(options);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update customized academic options (Protected Admin Route)
router.put('/', authMiddleware, async (req, res) => {
  const { departments, programmes, intakes } = req.body;

  try {
    let options = await AcademicOptions.findOne();
    if (!options) {
      options = new AcademicOptions();
    }

    if (departments) options.departments = departments;
    if (programmes) options.programmes = programmes;
    if (intakes) options.intakes = intakes;

    await options.save();
    res.json(options);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
