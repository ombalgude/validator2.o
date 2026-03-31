const express = require('express');
const Institution = require('../models/Institution');
const Certificate = require('../models/Certificate');
const { auth, authorize } = require('../middleware/auth');
const { validateInstitution } = require('../middleware/validation');

const router = express.Router();

const parseBoolean = (value) => {
  if (value === undefined) {
    return undefined;
  }

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

// @route   GET /api/institutions
// @desc    Get all institutions
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
    const search = req.query.search;
    const verified = parseBoolean(req.query.verified);
    const institutionType = req.query.institutionType;
    const parentInstitutionId = req.query.parentInstitutionId;
    const city = req.query.city;
    const state = req.query.state;
    const country = req.query.country;
    const sortBy = ['name', 'createdAt', 'updatedAt', 'establishedYear'].includes(req.query.sortBy)
      ? req.query.sortBy
      : 'name';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }
    if (verified !== undefined) {
      filter.isVerified = verified;
    }
    if (institutionType) {
      filter.institutionType = institutionType;
    }
    if (parentInstitutionId) {
      filter.parentInstitutionId = parentInstitutionId;
    }
    if (city) {
      filter['address.city'] = { $regex: city, $options: 'i' };
    }
    if (state) {
      filter['address.state'] = { $regex: state, $options: 'i' };
    }
    if (country) {
      filter['address.country'] = { $regex: country, $options: 'i' };
    }
    if (req.user.role === 'institution_admin' || req.user.role === 'university_admin') {
      filter._id = req.user.institutionId;
    }

    const institutions = await Institution.find(filter)
      .populate('createdBy', 'email fullName role')
      .populate('updatedBy', 'email fullName role')
      .populate('verifiedBy', 'email fullName role')
      .sort({ [sortBy]: sortOrder })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Institution.countDocuments(filter);

    res.json({
      institutions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get institutions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/institutions/:id
// @desc    Get institution by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id)
      .populate('createdBy', 'email fullName role')
      .populate('updatedBy', 'email fullName role')
      .populate('verifiedBy', 'email fullName role');

    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }

    if (
      (req.user.role === 'institution_admin' || req.user.role === 'university_admin') &&
      String(req.user.institutionId) !== String(institution._id)
    ) {
      return res.status(403).json({ message: 'Access denied for this institution' });
    }

    res.json(institution);
  } catch (error) {
    console.error('Get institution error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/institutions
// @desc    Create new institution
// @access  Private (Admin)
router.post('/', auth, authorize('admin'), validateInstitution, async (req, res) => {
  try {
    const institution = new Institution({
      ...req.body,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });
    await institution.save();

    res.status(201).json({
      message: 'Institution created successfully',
      institution
    });
  } catch (error) {
    console.error('Create institution error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Institution code already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/institutions/:id
// @desc    Update institution
// @access  Private (Admin)
router.put('/:id', auth, authorize('admin'), validateInstitution, async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id);

    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }

    Object.assign(institution, req.body, {
      updatedBy: req.user._id,
    });

    await institution.save();

    res.json({
      message: 'Institution updated successfully',
      institution
    });
  } catch (error) {
    console.error('Update institution error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Institution code already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/institutions/:id
// @desc    Delete institution
// @access  Private (Admin)
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const certificateCount = await Certificate.countDocuments({ institutionId: req.params.id });
    if (certificateCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete institution with existing certificates'
      });
    }

    const institution = await Institution.findByIdAndDelete(req.params.id);
    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }

    res.json({ message: 'Institution deleted successfully' });
  } catch (error) {
    console.error('Delete institution error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/institutions/:id/verify
// @desc    Verify/unverify institution
// @access  Private (Admin)
router.put('/:id/verify', auth, authorize('admin'), async (req, res) => {
  try {
    const isVerified = parseBoolean(req.body.isVerified);
    const verificationReason = typeof req.body.verificationReason === 'string'
      ? req.body.verificationReason.trim()
      : '';

    if (isVerified === undefined) {
      return res.status(400).json({ message: 'isVerified must be true or false' });
    }

    const institution = await Institution.findById(req.params.id);

    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }

    institution.isVerified = isVerified;
    institution.updatedBy = req.user._id;
    institution.verificationReason = verificationReason;
    institution.verifiedBy = isVerified ? req.user._id : null;
    institution.verifiedAt = isVerified ? new Date() : null;

    await institution.save();

    res.json({
      message: `Institution ${isVerified ? 'verified' : 'unverified'} successfully`,
      institution
    });
  } catch (error) {
    console.error('Verify institution error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
