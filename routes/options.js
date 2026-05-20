const express = require('express');
const router = express.Router();
const AcademicOptions = require('../models/AcademicOptions');
const authMiddleware = require('../middleware/authMiddleware');

// Get all customizable academic options (Departments, Programmes, Intakes)
// If empty, automatically seed with the initial default arrays
router.get('/', async (req, res) => {
  try {
    let options = await AcademicOptions.findOne();
    if (!options) {
      // Default initial options matching the Google Form, with intakes fully linked
      options = new AcademicOptions({
        departments: [
          'Level 5 Higher Diploma',
          'Level 4 Executive Diploma',
          'Level 7 Post Graduate Diploma',
          'Level 2 Diploma'
        ],
        programmes: [
          { department: 'Level 5 Higher Diploma', programme: 'Executive Diploma in Marketing' },
          { department: 'Level 5 Higher Diploma', programme: 'Executive Diploma in Marketing Management' },
          { department: 'Level 4 Executive Diploma', programme: 'Executive Diploma in HRM' },
          { department: 'Level 7 Post Graduate Diploma', programme: 'Executive Diploma in Human Capital Management' },
          { department: 'Level 2 Diploma', programme: 'Executive Diploma in Supply Chain Management' }
        ],
        intakes: [
          { department: 'Level 5 Higher Diploma', programme: 'Executive Diploma in Marketing', intake: 'January 2026 - July 2026' },
          { department: 'Level 5 Higher Diploma', programme: 'Executive Diploma in Marketing Management', intake: 'February 2026 - August 2026' },
          { department: 'Level 4 Executive Diploma', programme: 'Executive Diploma in HRM', intake: 'March 2026 - September 2026' },
          { department: 'Level 7 Post Graduate Diploma', programme: 'Executive Diploma in Human Capital Management', intake: 'April 2026 - October 2026' },
          { department: 'Level 2 Diploma', programme: 'Executive Diploma in Supply Chain Management', intake: 'May 2026 - November 2026' }
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
