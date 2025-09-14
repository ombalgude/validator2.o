const mongoose = require('mongoose');

const InstitutionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  contactInfo: {
    email: String,
    phone: String,
    website: String
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  establishedYear: {
    type: Number,
    required: true
  },
  accreditation: [{
    body: String,
    date: Date,
    status: String
  }],
  apiEndpoint: {
    type: String
  },
  certificateTemplates: [{
    name: String,
    templateId: String,
    fields: [String]
  }],
  totalCertificates: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient queries
InstitutionSchema.index({ code: 1 });
InstitutionSchema.index({ name: 1 });
InstitutionSchema.index({ isVerified: 1 });

module.exports = mongoose.model('Institution', InstitutionSchema);
