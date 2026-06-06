const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const authMiddleware = require('../middleware/authMiddleware');

// Get recent activity logs (Protected Admin Route)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const logs = await ActivityLog.find()
      .sort({ timestamp: -1 })
      .limit(100);
    res.json(logs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Clear all activity logs (Protected Admin Route)
router.delete('/', authMiddleware, async (req, res) => {
  try {
    await ActivityLog.deleteMany({});
    res.json({ message: 'All activity logs cleared.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
