const mongoose = require('mongoose');

const VerificationLogSchema = new mongoose.Schema({
  certificateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Certificate',
    required: true
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  result: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String
  },
  verificationMethod: {
    type: String,
    enum: ['manual', 'ai_automated', 'database_check'],
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index for efficient queries
VerificationLogSchema.index({ certificateId: 1 });
VerificationLogSchema.index({ verifiedBy: 1 });
VerificationLogSchema.index({ timestamp: -1 });
VerificationLogSchema.index({ result: 1 });

module.exports = mongoose.model('VerificationLog', VerificationLogSchema);
