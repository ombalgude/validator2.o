const express = require('express');
const Institution = require('../models/Institution');
const { auth, authorize } = require('../middleware/auth');
const { validateInstitution } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/institutions
// @desc    Get all institutions
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search;
    const verified = req.query.verified;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }
    if (verified !== undefined) {
      filter.isVerified = verified === 'true';
    }

    const institutions = await Institution.find(filter)
      .sort({ name: 1 })
      .limit(limit * 1)
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
    const institution = await Institution.findById(req.params.id);
    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
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
    const institution = new Institution(req.body);
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
    const institution = await Institution.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }

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
    const { isVerified } = req.body;
    const institution = await Institution.findByIdAndUpdate(
      req.params.id,
      { isVerified },
      { new: true }
    );

    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }

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
