const ActivityLog = require('../models/ActivityLog');

const logActivity = async (action, description, category = 'general', performedBy = 'User') => {
  try {
    const newLog = new ActivityLog({ action, description, category, performedBy });
    await newLog.save();
    console.log(`[ACTIVITY LOG] ${action}: ${description} (${performedBy})`);
  } catch (err) {
    console.error('Failed to write activity log:', err.message);
  }
};

module.exports = { logActivity };
