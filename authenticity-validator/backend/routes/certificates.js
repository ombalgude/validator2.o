const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Certificate = require('../models/Certificate');
// const Institution = require('../models/Institution');
const VerificationLog = require('../models/VerificationLog');
const { auth, authorize } = require('../middleware/auth');
const { uploadSingle, uploadMultiple } = require('../middleware/upload');
const { validateCertificate } = require('../middleware/validation');

const router = express.Router();

// @route   POST /api/certificates/verify
// @desc    Upload and verify a single certificate
// @access  Private
router.post('/verify', auth, uploadSingle, validateCertificate, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { studentName, rollNumber, course, degree, issueDate, institutionId } = req.body;

    // Generate certificate ID
    const certificateId = crypto.randomBytes(16).toString('hex');

    // Calculate file hash
    const fileBuffer = fs.readFileSync(req.file.path);
    const documentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Create certificate record
    const certificate = new Certificate({
      certificateId,
      studentName,
      rollNumber,
      institutionId,
      course,
      degree,
      issueDate: new Date(issueDate),
      documentHash,
      uploadedBy: req.user.id,
      filePath: req.file.path,
      originalFileName: req.file.originalname
    });

    await certificate.save();

    // TODO: Trigger AI verification process
    // This would typically call the AI services to process the certificate

    res.status(201).json({
      message: 'Certificate uploaded successfully',
      certificate: {
        id: certificate._id,
        certificateId: certificate.certificateId,
        status: certificate.verificationStatus
      }
    });
  } catch (error) {
    console.error('Certificate upload error:', error);
    res.status(500).json({ message: 'Server error during certificate upload' });
  }
});

// @route   POST /api/certificates/bulk
// @desc    Upload multiple certificates (for institutions)
// @access  Private (Institution role)
router.post('/bulk', auth, authorize('institution'), uploadMultiple, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const certificates = [];
    const errors = [];

    for (let i = 0; i < req.files.length; i++) {
      try {
        const file = req.files[i];
        const certificateId = crypto.randomBytes(16).toString('hex');
        const fileBuffer = fs.readFileSync(file.path);
        const documentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        const certificate = new Certificate({
          certificateId,
          studentName: `Student ${i + 1}`, // This would come from form data
          rollNumber: `ROLL${i + 1}`,
          institutionId: req.user.institutionId,
          course: 'Unknown Course',
          degree: 'Unknown Degree',
          issueDate: new Date(),
          documentHash,
          uploadedBy: req.user.id,
          filePath: file.path,
          originalFileName: file.originalname
        });

        await certificate.save();
        certificates.push(certificate);
      } catch (error) {
        errors.push({ file: req.files[i].originalname, error: error.message });
      }
    }

    res.status(201).json({
      message: 'Bulk upload completed',
      uploaded: certificates.length,
      errors: errors.length,
      certificates: certificates.map(cert => ({
        id: cert._id,
        certificateId: cert.certificateId,
        status: cert.verificationStatus
      })),
      errors
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ message: 'Server error during bulk upload' });
  }
});

// @route   GET /api/certificates/:id
// @desc    Get certificate details and verification results
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('institutionId', 'name code')
      .populate('uploadedBy', 'email role');

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    res.json(certificate);
  } catch (error) {
    console.error('Get certificate error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/certificates
// @desc    Get all certificates with filtering and pagination
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const institutionId = req.query.institutionId;

    const filter = {};
    if (status) filter.verificationStatus = status;
    if (institutionId) filter.institutionId = institutionId;
    if (req.user.role === 'institution') {
      filter.institutionId = req.user.institutionId;
    }

    const certificates = await Certificate.find(filter)
      .populate('institutionId', 'name code')
      .populate('uploadedBy', 'email role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Certificate.countDocuments(filter);

    res.json({
      certificates,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/certificates/:id/verify
// @desc    Update certificate verification status
// @access  Private (Admin/Verifier)
router.put('/:id/verify', auth, authorize('admin', 'verifier'), async (req, res) => {
  try {
    const { status, verificationResults } = req.body;

    const certificate = await Certificate.findById(req.params.id);
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    certificate.verificationStatus = status;
    if (verificationResults) {
      certificate.verificationResults = { ...certificate.verificationResults, ...verificationResults };
    }

    await certificate.save();

    // Log verification
    const log = new VerificationLog({
      certificateId: certificate._id,
      verifiedBy: req.user.id,
      result: status,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      verificationMethod: 'manual'
    });

    await log.save();

    res.json({
      message: 'Certificate verification updated',
      certificate
    });
  } catch (error) {
    console.error('Update verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
