const mongoose = require('mongoose');

const VerifierSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    organizationName: {
      type: String,
      trim: true,
      maxlength: 160,
      default: '',
    },
    verifierType: {
      type: String,
      enum: ['internal', 'external', 'automated'],
      default: 'external',
    },
    assignedInstitutionIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Institution',
        },
      ],
      default: [],
    },
    accessLevel: {
      type: String,
      enum: ['read', 'verify', 'audit'],
      default: 'verify',
    },
    lastVerifiedAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

VerifierSchema.index({ verifierType: 1, accessLevel: 1, isActive: 1 });

module.exports = mongoose.models.Verifier || mongoose.model('Verifier', VerifierSchema);
