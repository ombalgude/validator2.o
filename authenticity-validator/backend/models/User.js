const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'institution', 'verifier'],
    required: true
  },
  institutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: function() {
      return this.role === 'institution';
    }
  },
  permissions: [{
    type: String
  }],
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ institutionId: 1 });

module.exports = mongoose.model('User', UserSchema);
