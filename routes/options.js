const express        = require('express');
const router         = express.Router();
const AcademicOptions= require('../models/AcademicOptions');
const authMiddleware = require('../middleware/authMiddleware');
const { logActivity }= require('../utils/logger');

// ─── GET all customizable academic options ────────────────────────────────────
// Returns { departments, programmes, intakes } — auto-seeds defaults if empty.

router.get('/', async (req, res) => {
  try {
    const options = await AcademicOptions.getOptions();
    res.json(options);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── PUT — update academic options (Protected Admin Route) ───────────────────

router.put('/', authMiddleware, async (req, res) => {
  const { departments, programmes, intakes } = req.body;

  try {
    // Fetch existing values so we can fall back to them if a field isn't provided
    const current = await AcademicOptions.getOptions();

    const newDepts     = departments || current.departments;
    const newProgs     = programmes  || current.programmes;
    const newIntakes   = intakes     || current.intakes;

    const updated = await AcademicOptions.setOptions(newDepts, newProgs, newIntakes);

    await logActivity(
      'Settings Updated',
      'Academic options (Programmes, Courses, and Intakes) were updated',
      'programme',
      'Admin'
    );

    res.json(updated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
