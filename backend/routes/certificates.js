const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const Certificate = require('../models/Certificate');
const VerificationLog = require('../models/VerificationLog');
const { auth, authorize } = require('../middleware/auth');
const { uploadSingle, uploadMultiple } = require('../middleware/upload');
const { normalizeCertificateRequest, validateCertificate } = require('../middleware/validation');
const { normalizeCertificateInput, parseJsonIfNeeded } = require('../utils/certificatePayload');

const router = express.Router();

// @route   POST /api/certificates/verify
// @desc    Upload and verify a single certificate
// @access  Private
router.post('/verify', auth, uploadSingle, normalizeCertificateRequest, validateCertificate, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const documentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const certificate = new Certificate({
      ...req.body,
      documentHash,
      uploadedBy: req.user.id,
      filePath: req.file.path,
      originalFileName: req.file.originalname,
      sourceType: 'manual_upload',
    });

    await certificate.save();

    res.status(201).json({
      message: 'Certificate uploaded successfully',
      certificate: {
        id: certificate._id,
        certificateId: certificate.certificateId,
        certificateHash: certificate.certificateHash,
        status: certificate.verificationStatus,
      },
    });
  } catch (error) {
    console.error('Certificate upload error:', error);

    if (error?.code === 11000) {
      return res.status(400).json({ message: 'Certificate ID or certificate hash already exists' });
    }

    return res.status(500).json({ message: 'Server error during certificate upload' });
  }
});

// @route   POST /api/certificates/bulk
// @desc    Upload multiple certificates (for institutions)
// @access  Private (Institution admin role)
router.post('/bulk', auth, authorize('institution_admin', 'university_admin'), uploadMultiple, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const records = parseJsonIfNeeded(req.body.records, []);
    if (!Array.isArray(records) || records.length !== req.files.length) {
      return res.status(400).json({
        message: 'Bulk upload requires a records JSON array with one certificate payload per file',
      });
    }

    const certificates = [];
    const errors = [];

    for (let index = 0; index < req.files.length; index += 1) {
      const file = req.files[index];

      try {
        const normalizedRecord = normalizeCertificateInput(records[index]);
        normalizedRecord.institutionId = normalizedRecord.institutionId || req.user.institutionId;

        const fileBuffer = fs.readFileSync(file.path);
        const documentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        const certificate = new Certificate({
          ...normalizedRecord,
          documentHash,
          uploadedBy: req.user.id,
          filePath: file.path,
          originalFileName: file.originalname,
          sourceType: 'bulk_upload',
        });

        await certificate.save();
        certificates.push(certificate);
      } catch (error) {
        errors.push({
          file: file.originalname,
          error: error.message,
        });
      }
    }

    res.status(201).json({
      message: 'Bulk upload completed',
      uploaded: certificates.length,
      failed: errors.length,
      certificates: certificates.map((certificate) => ({
        id: certificate._id,
        certificateId: certificate.certificateId,
        certificateHash: certificate.certificateHash,
        status: certificate.verificationStatus,
      })),
      errors,
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
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const status = req.query.status;
    const institutionId = req.query.institutionId;

    const filter = {};
    if (status) filter.verificationStatus = status;
    if (institutionId) filter.institutionId = institutionId;
    if (req.user.role === 'institution_admin' || req.user.role === 'university_admin') {
      filter.institutionId = req.user.institutionId;
    }

    const certificates = await Certificate.find(filter)
      .populate('institutionId', 'name code')
      .populate('uploadedBy', 'email role')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Certificate.countDocuments(filter);

    res.json({
      certificates,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/certificates/:id/verify
// @desc    Update certificate verification status
// @access  Private (Admin/Verifier)
router.put('/:id/verify', auth, authorize('admin', 'verifier', 'company_admin'), async (req, res) => {
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

    const log = new VerificationLog({
      certificateId: certificate._id,
      verifiedBy: req.user.id,
      institutionId: certificate.institutionId,
      result: status,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      verificationMethod: 'manual',
      certificateHash: certificate.certificateHash,
      verifierRole: req.user.role,
      details: verificationResults || {},
    });

    await log.save();

    res.json({
      message: 'Certificate verification updated',
      certificate,
    });
  } catch (error) {
    console.error('Update verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
