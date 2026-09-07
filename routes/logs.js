const express        = require('express');
const router         = express.Router();
const ActivityLog    = require('../models/ActivityLog');
const authMiddleware = require('../middleware/authMiddleware');

// ─── GET recent activity logs (Protected Admin Route) ─────────────────────────

router.get('/', authMiddleware, async (req, res) => {
  try {
    const logs = await ActivityLog.findRecent(100);
    res.json(logs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ─── DELETE all activity logs (Protected Admin Route) ─────────────────────────

router.delete('/', authMiddleware, async (req, res) => {
  try {
    await ActivityLog.deleteAll();
    res.json({ message: 'All activity logs cleared.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
