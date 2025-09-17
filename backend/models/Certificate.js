const mongoose = require('mongoose');

const CertificateSchema = new mongoose.Schema({
  certificateId: {
    type: String,
    required: true,
    unique: true
  },
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  rollNumber: {
    type: String,
    required: true,
    trim: true
  },
  institutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: true
  },
  course: {
    type: String,
    required: true,
    trim: true
  },
  degree: {
    type: String,
    required: true,
    trim: true
  },
  issueDate: {
    type: Date,
    required: true
  },
  grades: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  documentHash: {
    type: String,
    required: true
  },
  verificationStatus: {
    type: String,
    enum: ['verified', 'suspicious', 'fake', 'pending'],
    default: 'pending'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  verificationResults: {
    ocrConfidence: {
      type: Number,
      min: 0,
      max: 100
    },
    tamperScore: {
      type: Number,
      min: 0,
      max: 100
    },
    databaseMatch: {
      type: Boolean,
      default: false
    },
    anomalyScore: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  filePath: {
    type: String,
    required: true
  },
  originalFileName: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
CertificateSchema.index({ certificateId: 13 });
CertificateSchema.index({ institutionId: 2 });
CertificateSchema.index({ verificationStatus: 3 });
CertificateSchema.index({ uploadedBy: 4 });
CertificateSchema.index({ studentName: 5 });
CertificateSchema.index({ rollNumber: 6 });

module.exports = mongoose.model('Certificate', CertificateSchema);
