const mongoose = require('mongoose');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SubmittedDocumentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 160,
      default: '',
    },
    url: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    documentType: {
      type: String,
      trim: true,
      maxlength: 80,
      default: 'supporting_document',
    },
  },
  {
    _id: false,
  }
);

const UniversityAdminRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    fullName: {
      type: String,
      trim: true,
      maxlength: 160,
      default: '',
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
      match: EMAIL_REGEX,
    },
    universityName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      default: null,
      index: true,
    },
    adminCode: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 32,
      default: '',
    },
    department: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    title: {
      type: String,
      trim: true,
      maxlength: 120,
      default: 'University Admin',
    },
    submittedDocuments: {
      type: [SubmittedDocumentSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewNote: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    approvedProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UniversityAdmin',
      default: null,
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

UniversityAdminRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.models.UniversityAdminRequest ||
  mongoose.model('UniversityAdminRequest', UniversityAdminRequestSchema);
