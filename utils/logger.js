const ActivityLog = require('../models/ActivityLog');

const logActivity = async (action, description, category = 'general', performedBy = 'User') => {
  try {
    await ActivityLog.create(action, description, category, performedBy);
    console.log(`[ACTIVITY LOG] ${action}: ${description} (${performedBy})`);
  } catch (err) {
    console.error('Failed to write activity log:', err.message);
  }
};

module.exports = { logActivity };
