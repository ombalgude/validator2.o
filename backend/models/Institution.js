const mongoose = require('mongoose');

const currentYear = new Date().getFullYear();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const InstitutionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 20,
      match: /^[A-Z0-9_-]{2,20}$/,
      alias: 'institutionCode',
    },
    institutionType: {
      type: String,
      enum: ['institution', 'college', 'university', 'board', 'company'],
      default: 'institution',
      index: true,
    },
    parentInstitutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      default: null,
      index: true,
    },
    address: {
      line1: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      country: { type: String, trim: true, default: '' },
    },
    contactInfo: {
      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: '',
        match: EMAIL_REGEX,
      },
      phone: {
        type: String,
        trim: true,
        default: '',
      },
      website: {
        type: String,
        trim: true,
        default: '',
      },
    },
    officialDomains: {
      type: [String],
      default: [],
    },
    establishedYear: {
      type: Number,
      min: 1800,
      max: currentYear,
      default: null,
    },
    accreditation: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    apiEndpoint: {
      type: String,
      trim: true,
      default: '',
    },
    certificateTemplates: {
      type: [String],
      default: [],
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    totalCertificates: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    verificationReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

InstitutionSchema.pre('validate', function normalizeInstitution(next) {
  if (Array.isArray(this.officialDomains)) {
    this.officialDomains = [...new Set(
      this.officialDomains
        .map((domain) => String(domain || '').trim().toLowerCase())
        .filter(Boolean)
    )];
  }

  next();
});

InstitutionSchema.index({ name: 1 });
InstitutionSchema.index({ institutionType: 1, isVerified: 1 });

module.exports = mongoose.models.Institution || mongoose.model('Institution', InstitutionSchema);
