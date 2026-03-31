const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const Certificate = require('../models/Certificate');
const Institution = require('../models/Institution');
const CompanyAdmin = require('../models/company_admin');
const VerificationLog = require('../models/VerificationLog');
const Verifier = require('../models/Verifier');
const { auth, authorize } = require('../middleware/auth');
const { uploadSingle, uploadMultiple } = require('../middleware/upload');
const { normalizeCertificateRequest, validateCertificate } = require('../middleware/validation');
const { normalizeCertificateInput, parseJsonIfNeeded } = require('../utils/certificatePayload');

const router = express.Router();

const VALID_CERTIFICATE_STATUSES = ['verified', 'suspicious', 'fake', 'pending'];
const DEFAULT_LIST_LIMIT = 10;
const MAX_LIST_LIMIT = 100;

const resolveCertificateQuery = (identifier) => {
  const trimmedIdentifier = String(identifier || '').trim();

  if (!trimmedIdentifier) {
    return null;
  }

  if (/^[a-f\d]{24}$/i.test(trimmedIdentifier)) {
    return { _id: trimmedIdentifier };
  }

  return { certificateId: trimmedIdentifier.toUpperCase() };
};

const buildCertificateFilters = async (query, user) => {
  const filter = {};

  if (query.status) {
    filter.verificationStatus = query.status;
  }

  if (query.institutionId) {
    filter.institutionId = query.institutionId;
  }

  if (query.studentName) {
    filter.studentName = { $regex: query.studentName, $options: 'i' };
  }

  if (query.rollNumber) {
    filter.rollNumber = { $regex: query.rollNumber, $options: 'i' };
  }

  if (query.certificateId) {
    filter.certificateId = String(query.certificateId).trim().toUpperCase();
  }

  if (query.certificateHash) {
    filter.certificateHash = String(query.certificateHash).trim().toLowerCase();
  }

  if (query.dateFrom || query.dateTo) {
    filter.uploadedAt = {};

    if (query.dateFrom) {
      filter.uploadedAt.$gte = new Date(query.dateFrom);
    }

    if (query.dateTo) {
      filter.uploadedAt.$lte = new Date(query.dateTo);
    }
  }

  if (user.role === 'institution_admin' || user.role === 'university_admin') {
    filter.institutionId = user.institutionId;
  }

  if (user.role === 'company_admin') {
    const companyAdminProfile = await CompanyAdmin.findOne({ userId: user._id, isActive: true }).lean();

    if (!companyAdminProfile) {
      filter._id = null;
      return filter;
    }

    if (companyAdminProfile.accessScope === 'specific_institutions') {
      const scopedInstitutionIds = (companyAdminProfile.institutionIds || []).map(String);
      filter.institutionId = { $in: scopedInstitutionIds.length > 0 ? scopedInstitutionIds : [null] };
    } else {
      const verifiedInstitutionIds = await Institution.find({ isVerified: true }).distinct('_id');
      filter.institutionId = { $in: verifiedInstitutionIds };
    }
  }

  if (user.role === 'verifier') {
    const verifierProfile = await Verifier.findOne({ userId: user._id, isActive: true }).lean();

    if (!verifierProfile) {
      filter._id = null;
      return filter;
    }

    if (verifierProfile.verifierType !== 'internal') {
      const scopedInstitutionIds = (verifierProfile.assignedInstitutionIds || []).map(String);
      filter.institutionId = { $in: scopedInstitutionIds.length > 0 ? scopedInstitutionIds : [null] };
    }
  }

  return filter;
};

const canAccessCertificateForUser = async (user, certificate) => {
  if (user.role === 'admin') {
    return true;
  }

  const scopedFilter = await buildCertificateFilters({}, user);
  if (scopedFilter._id === null) {
    return false;
  }

  if (!scopedFilter.institutionId) {
    return true;
  }

  const certificateInstitutionId = String(certificate.institutionId?._id || certificate.institutionId);
  if (scopedFilter.institutionId.$in) {
    return scopedFilter.institutionId.$in.map(String).includes(certificateInstitutionId);
  }

  return String(scopedFilter.institutionId) === certificateInstitutionId;
};

// @route   POST /api/certificates/verify
// @desc    Upload and verify a single certificate
// @access  Private
router.post(
  '/verify',
  auth,
  authorize('admin', 'institution_admin', 'university_admin'),
  uploadSingle,
  normalizeCertificateRequest,
  validateCertificate,
  async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const institution = await Institution.findById(req.body.institutionId).select('_id');
    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
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
    await Institution.findByIdAndUpdate(certificate.institutionId, { $inc: { totalCertificates: 1 } });

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
router.post('/bulk', auth, authorize('admin', 'institution_admin', 'university_admin'), uploadMultiple, async (req, res) => {
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

        if (!normalizedRecord.institutionId) {
          throw new Error('Institution ID is required for bulk upload');
        }

        const institutionExists = await Institution.exists({ _id: normalizedRecord.institutionId });
        if (!institutionExists) {
          throw new Error('Institution not found');
        }

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
        await Institution.findByIdAndUpdate(certificate.institutionId, { $inc: { totalCertificates: 1 } });
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
    const certificateQuery = resolveCertificateQuery(req.params.id);
    if (!certificateQuery) {
      return res.status(400).json({ message: 'Certificate identifier is required' });
    }

    const certificate = await Certificate.findOne(certificateQuery)
      .populate('institutionId', 'name code')
      .populate('uploadedBy', 'email role');

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    if (!(await canAccessCertificateForUser(req.user, certificate))) {
      return res.status(403).json({ message: 'Access denied for this certificate' });
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
    const limit = Math.min(parseInt(req.query.limit, 10) || DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT);
    const sortBy = ['createdAt', 'uploadedAt', 'issueDate', 'studentName', 'certificateId'].includes(req.query.sortBy)
      ? req.query.sortBy
      : 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const filter = await buildCertificateFilters(req.query, req.user);

    const certificates = await Certificate.find(filter)
      .populate('institutionId', 'name code')
      .populate('uploadedBy', 'email role')
      .sort({ [sortBy]: sortOrder })
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
    const { status, verificationResults, verificationMethod, reason } = req.body;

    if (!VALID_CERTIFICATE_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid verification status' });
    }

    const certificateQuery = resolveCertificateQuery(req.params.id);
    if (!certificateQuery) {
      return res.status(400).json({ message: 'Certificate identifier is required' });
    }

    const certificate = await Certificate.findOne(certificateQuery);
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    if (!(await canAccessCertificateForUser(req.user, certificate))) {
      return res.status(403).json({ message: 'Access denied for this certificate' });
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
      verificationMethod: verificationMethod || 'manual_review',
      certificateHash: certificate.certificateHash,
      verifierRole: req.user.role,
      details: {
        ...(verificationResults || {}),
        ...(reason ? { reason: String(reason).trim() } : {}),
      },
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
