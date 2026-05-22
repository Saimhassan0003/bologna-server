const mongoose = require('mongoose');

const centreSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  phone: { type: String, default: '', trim: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Centre', centreSchema);
