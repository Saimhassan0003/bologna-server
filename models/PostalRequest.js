const mongoose = require('mongoose');

/**
 * PostalRequest Schema
 * Tracks the full lifecycle of a student's postal document request.
 */
const postalRequestSchema = new mongoose.Schema(
  {
    // Student's email — used as their unique identifier for lookup
    studentId: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },

    // Auto-generated unique application number e.g. PR-20240623-4821
    applicationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    // Full form data submitted by the student
    formData: {
      fullName:       { type: String, trim: true },
      fatherName:     { type: String, trim: true },
      phone:          { type: String, trim: true },
      address:        { type: String, trim: true },
      passportOrCnic: { type: String, trim: true },
      programName:    { type: String, trim: true },
      rollNumber:     { type: String, trim: true }
    },

    // Documents that have been successfully uploaded
    documents: [
      {
        name:       { type: String, required: true },
        path:       { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now }
      }
    ],

    // Names of required documents that are still missing
    // e.g. ['identityProof', 'addressProof']
    missingDocuments: {
      type: [String],
      default: []
    },

    // Application lifecycle status
    status: {
      type: String,
      enum: ['DOCUMENT_PENDING', 'SUBMITTED', 'EXPIRED'],
      default: 'DOCUMENT_PENDING'
    },

    // Deadline by which student must upload missing documents
    documentDeadline: {
      type: Date,
      default: null
    },

    // Timestamp when all docs were received and status became SUBMITTED
    submittedAt: {
      type: Date,
      default: null
    },

    // Timestamp when application expired due to missing docs
    expiredAt: {
      type: Date,
      default: null
    },

    // Track whether we have already sent expiry emails (avoid duplicates)
    expiryEmailSent: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true // adds createdAt and updatedAt automatically
  }
);

// Index for fast lookup by studentId (email)
postalRequestSchema.index({ studentId: 1 });

module.exports = mongoose.model('PostalRequest', postalRequestSchema);
