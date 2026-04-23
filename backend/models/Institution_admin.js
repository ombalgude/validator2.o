const mongoose = require('mongoose');
const User = require("../models/User.js");
const Institution = require("../models/Institution.js");

const InstitutionAdminSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    adminCode: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 32,
      unique: true,
      sparse: true,
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
      default: 'Institution Admin',
    },
    canIssueCertificates: {
      type: Boolean,
      default: true,
    },
    permissions: {
      type: [String],
      default: ['upload_certificates', 'view_own_certificates', 'manage_institution_users'],
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

InstitutionAdminSchema.index({ institutionId: 1, isActive: 1 });

module.exports = mongoose.models.InstitutionAdmin || mongoose.model('InstitutionAdmin', InstitutionAdminSchema);
