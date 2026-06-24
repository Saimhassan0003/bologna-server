const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  // Personal Info
  firstName: { type: String },
  lastName: { type: String },
  fullName: { type: String, required: true },
  certificateName: { type: String, required: true },
  dob: { type: Date, required: true },
  gender: { 
    type: String, 
    enum: ['Male', 'Female', 'Prefer Not to Say'], 
    required: true 
  },
  email: { type: String, required: true },
  referenceNumber: { type: String, unique: true, index: true },
  uniqueToken: { type: String, unique: true, index: true },
  phone: { type: String, required: true },
  passportNumber: { type: String, required: true },
  country: { type: String, required: true },
  address: { type: String, required: true },

  // Academic Info
  department: { type: String, required: true },
  programme: { type: String, required: true },
  courseStartDate: { type: String, default: '' },
  courseEndDate: { type: String, default: '' },
  intake: { type: String, default: '' },
  creditHours: { type: String, default: '' },
  price: { type: String, default: '' },
  registrationViaCentre: { type: String, default: 'No' }, // 'Yes' or 'No'
  centreName: { type: String, default: '' },
  centreEmail: { type: String, default: '' },
  centrePhone: { type: String, default: '' },
  highestQualification: { type: String, required: true },

  // Files
  profilePicture: { type: String, default: '' }, // Optional
  passportCopy: { type: String, default: '' }, // Optional
  resume: { type: String, default: '' }, // Optional
  transcript1: { type: String, default: '' }, // Optional
  transcript2: { type: String, default: '' }, // Optional
  transcript3: { type: String, default: '' }, // Optional

  // Document tracking
  missingDocuments: {
    type: [String], // ['profilePicture', 'resume', etc]
    default: []
  },

  submissionDate: { type: Date, default: Date.now },
  documentDeadline: { type: Date, default: null }, // 5-minute deadline for pending documents
  documentSubmittedAt: { type: Date, default: null }, // When all docs completed
  docsUploadedAt: { type: Date, default: null },
  
  status: {
    type: String,
    enum: ['Submitted', 'PendingDocuments', 'Reviewed', 'Accepted', 'Rejected'],
    default: 'Submitted'
  },

  // Expiry tracking
  expiryEmailSent: { type: Boolean, default: false },
  expiredAt: { type: Date, default: null }
});

// Ensure a unique index on email to prevent duplicate submissions
applicationSchema.index({ email: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Application', applicationSchema);