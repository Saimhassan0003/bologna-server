const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  description: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  category: { 
    type: String, 
    enum: ['application', 'centre', 'programme', 'status', 'general'], 
    default: 'general' 
  },
  performedBy: { 
    type: String, 
    enum: ['Admin', 'User', 'System'], 
    default: 'User' 
  }
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
