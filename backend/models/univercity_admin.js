const mongoose = require('mongoose');

const UniversityAdminSchema = new mongoose.Schema(
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
      default: 'University Admin',
    },
    permissions: {
      type: [String],
      default: ['upload_certificates', 'view_own_certificates', 'manage_university_records'],
    },
    canApproveInstitutionAdmins: {
      type: Boolean,
      default: true,
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

UniversityAdminSchema.index({ institutionId: 1, isActive: 1 });

module.exports = mongoose.models.UniversityAdmin || mongoose.model('UniversityAdmin', UniversityAdminSchema);
