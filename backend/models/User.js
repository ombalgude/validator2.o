const mongoose = require('mongoose');
const Institution = require("../models/Institution.js");
const CompanyAdmin = require("../models/company_admin.js");
const InstitutionAdmin = require("../models/Institution_admin.js");
const UniversityAdmin = require("../models/univercity_admin.js");

const ROLE_PERMISSIONS = {
  admin: ['manage_users', 'manage_institutions', 'manage_certificates', 'verify_certificates', 'view_reports'],
  institution_admin: ['upload_certificates', 'view_own_certificates', 'manage_institution_users'],
  university_admin: ['upload_certificates', 'view_own_certificates', 'manage_university_records'],
  company_admin: ['verify_certificates', 'view_verification_logs'],
  verifier: ['verify_certificates', 'view_certificates'],
  user: ['view_profile'],
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UserSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
      maxlength: 160,
      default: '',
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: EMAIL_REGEX,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: Object.keys(ROLE_PERMISSIONS),
      default: 'user',
      index: true,
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      default: null,
      index: true,
    },
    companyName: {
      type: String,
      trim: true,
      maxlength: 160,
      default: '',
    },
    emailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    permissions: {
      type: [String],
      default: undefined,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    passwordChangedAt: {
      type: Date,
      default: Date.now,
    },

    
  },
  {
    timestamps: true,
    minimize: false,
  }
);

UserSchema.pre('validate', function setDefaultPermissions(next) {
  if (this.isModified('role') || !Array.isArray(this.permissions) || this.permissions.length === 0) {
    this.permissions = [...(ROLE_PERMISSIONS[this.role] || ROLE_PERMISSIONS.user)];
  }

  next();
});

UserSchema.index({ role: 1, isActive: 1 });

UserSchema.methods.hasPermission = function hasPermission(permission) {
  return Array.isArray(this.permissions) && this.permissions.includes(permission);
};

UserSchema.set('toJSON', {
  
  transform: (_document, returnedObject) => {
    delete returnedObject.password;
    return returnedObject;
  },
});

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
