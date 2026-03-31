const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

const ADMIN_ALLOWED_FIELDS = new Set([
  'fullName',
  'email',
  'role',
  'institutionId',
  'companyName',
  'emailVerified',
  'permissions',
  'isActive',
]);

const SELF_ALLOWED_FIELDS = new Set(['fullName', 'companyName']);
const VALID_ROLES = ['admin', 'institution_admin', 'university_admin', 'company_admin', 'verifier', 'user'];

const parseBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') {
      return true;
    }

    if (value.toLowerCase() === 'false') {
      return false;
    }
  }

  return undefined;
};

const sanitizeUserPayload = (body, allowedFields) => {
  const payload = {};

  if (allowedFields.has('fullName') && typeof body.fullName === 'string') {
    payload.fullName = body.fullName.trim();
  }

  if (allowedFields.has('email') && typeof body.email === 'string') {
    payload.email = body.email.trim().toLowerCase();
  }

  if (allowedFields.has('role') && typeof body.role === 'string' && VALID_ROLES.includes(body.role)) {
    payload.role = body.role;
  }

  if (allowedFields.has('institutionId') && Object.prototype.hasOwnProperty.call(body, 'institutionId')) {
    if (body.institutionId === null || body.institutionId === '') {
      payload.institutionId = null;
    } else if (mongoose.Types.ObjectId.isValid(body.institutionId)) {
      payload.institutionId = body.institutionId;
    }
  }

  if (allowedFields.has('companyName') && typeof body.companyName === 'string') {
    payload.companyName = body.companyName.trim();
  }

  if (allowedFields.has('emailVerified')) {
    const emailVerified = parseBoolean(body.emailVerified);
    if (emailVerified !== undefined) {
      payload.emailVerified = emailVerified;
    }
  }

  if (allowedFields.has('isActive')) {
    const isActive = parseBoolean(body.isActive);
    if (isActive !== undefined) {
      payload.isActive = isActive;
    }
  }

  if (allowedFields.has('permissions') && Array.isArray(body.permissions)) {
    payload.permissions = body.permissions
      .map((permission) => String(permission || '').trim())
      .filter(Boolean);
  }

  return payload;
};

const canAccessUser = (requestUser, targetUserId) =>
  requestUser.role === 'admin' || String(requestUser._id) === String(targetUserId);

router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
    const filter = {};

    if (req.query.role && VALID_ROLES.includes(req.query.role)) {
      filter.role = req.query.role;
    }

    if (req.query.isActive !== undefined) {
      const isActive = parseBoolean(req.query.isActive);
      if (isActive !== undefined) {
        filter.isActive = isActive;
      }
    }

    if (req.query.institutionId && mongoose.Types.ObjectId.isValid(req.query.institutionId)) {
      filter.institutionId = req.query.institutionId;
    }

    if (req.query.email) {
      filter.email = { $regex: req.query.email, $options: 'i' };
    }

    const users = await User.find(filter)
      .select('-password')
      .populate('institutionId', 'name code institutionType isVerified')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      users,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const payload = sanitizeUserPayload(req.body, ADMIN_ALLOWED_FIELDS);
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      ...payload,
      email,
      password: hashedPassword,
    });

    await user.save();

    const createdUser = await User.findById(user._id)
      .select('-password')
      .populate('institutionId', 'name code institutionType isVerified');

    res.status(201).json({
      message: 'User created successfully',
      user: createdUser,
    });
  } catch (error) {
    console.error('Create user error:', error);
    if (error?.code === 11000) {
      return res.status(400).json({ message: 'User already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    if (!canAccessUser(req.user, req.params.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('institutionId', 'name code institutionType isVerified');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    if (!canAccessUser(req.user, req.params.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(req.params.id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const allowedFields = req.user.role === 'admin' ? ADMIN_ALLOWED_FIELDS : SELF_ALLOWED_FIELDS;
    const payload = sanitizeUserPayload(req.body, allowedFields);

    if (payload.email && payload.email !== user.email) {
      const existingUser = await User.findOne({ email: payload.email, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    Object.assign(user, payload);

    if (req.user.role === 'admin' && typeof req.body.password === 'string' && req.body.password.length >= 8) {
      user.password = await bcrypt.hash(req.body.password, 10);
      user.passwordChangedAt = new Date();
    }

    await user.save();

    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('institutionId', 'name code institutionType isVerified');

    res.json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update user error:', error);
    if (error?.code === 11000) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = false;
    await user.save();

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
