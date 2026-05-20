const mongoose = require('mongoose');

const academicOptionsSchema = new mongoose.Schema({
  departments: { type: [String], default: [] },
  programmes: {
    type: [{
      department: { type: String, required: true },
      programme: { type: String, required: true }
    }],
    default: []
  },
  intakes: {
    type: [{
      department: { type: String, required: true },
      programme: { type: String, required: true },
      intake: { type: String, required: true }
    }],
    default: []
  }
});

module.exports = mongoose.model('AcademicOptions', academicOptionsSchema);
