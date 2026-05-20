const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  // Personal Info
  fullName: { type: String, required: true },
  certificateName: { type: String, required: true },
  dob: { type: Date, required: true },
  gender: { 
    type: String, 
    enum: ['Male', 'Female', 'Prefer Not to Say'], 
    required: true 
  },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  passportNumber: { type: String, required: true },
  country: { type: String, required: true },
  address: { type: String, required: true },

  // Academic Info
  department: { type: String, required: true },
  programme: { type: String, required: true },
  intake: { type: String, required: true },
  creditHours: { type: String, required: true },
  price: { type: String, required: true },
  registrationViaCentre: { type: String, default: 'No' }, // 'Yes' or 'No'
  centreEmail: { type: String, default: '' },
  centrePhone: { type: String, default: '' },
  highestQualification: { type: String, required: true },

  // Files
  profilePicture: { type: String, required: true },
  passportCopy: { type: String, required: true },
  resume: { type: String, required: true },
  transcript1: { type: String, required: true },
  transcript2: { type: String, default: '' }, // Optional
  transcript3: { type: String, default: '' }, // Optional

  submissionDate: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['Pending', 'Reviewed', 'Accepted', 'Rejected'],
    default: 'Pending'
  }
});

module.exports = mongoose.model('Application', applicationSchema);
