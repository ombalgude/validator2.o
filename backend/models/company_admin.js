const mongoose = require('mongoose');
const User = require("../models/User.js");
const Institution = require("../models/Institution.js");

const CompanyAdminSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    companyCode: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 32,
      unique: true,
      sparse: true,
    },
    institutionIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Institution',
        },
      ],
      default: [],
    },
    accessScope: {
      type: String,
      enum: ['specific_institutions', 'all_verified_institutions'],
      default: 'specific_institutions',
    },
    permissions: {
      type: [String],
      default: ['verify_certificates', 'view_verification_logs'],
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

CompanyAdminSchema.index({ companyName: 1, isActive: 1 });

module.exports = mongoose.models.CompanyAdmin || mongoose.model('CompanyAdmin', CompanyAdminSchema);
