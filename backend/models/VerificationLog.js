const mongoose = require('mongoose');
const { HASH_REGEX } = require('../utils/certificatePayload');
const User = require("../models/User.js");
const Institution = require("../models/Institution.js");
const CompanyAdmin = require("../models/company_admin.js");
const InstitutionAdmin = require("../models/Institution_admin.js");
const UniversityAdmin = require("../models/univercity_admin.js");

const VerificationLogSchema = new mongoose.Schema(
  {
    certificateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Certificate',
      required: true,
      index: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      default: null,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    result: {
      type: String,
      required: true,
      enum: ['verified', 'suspicious', 'fake', 'pending'],
      index: true,
    },
    ipAddress: {
      type: String,
      trim: true,
      maxlength: 64,
      default: '',
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 512,
      default: '',
    },
    verificationMethod: {
      type: String,
      enum: ['manual', 'ai_automated', 'database_check', 'manual_review', 'ai_analysis', 'system'],
      required: true,
    },
    certificateHash: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      match: HASH_REGEX,
    },
    actorRole: {
      type: String,
      trim: true,
      maxlength: 40,
      default: '',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

VerificationLogSchema.index({ certificateId: 1, timestamp: -1 });
VerificationLogSchema.index({ verifiedBy: 1, timestamp: -1 });
VerificationLogSchema.index({ institutionId: 1, timestamp: -1 });

module.exports = mongoose.models.VerificationLog || mongoose.model('VerificationLog', VerificationLogSchema);
