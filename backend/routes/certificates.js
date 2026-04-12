const express = require('express');
const Certificate = require('../models/Certificate');
const { auth, authorize } = require('../middleware/auth');
const { uploadSingle, uploadMultiple } = require('../middleware/upload');
const {
  normalizeCertificateComparisonRequest,
  normalizeCertificateRequest,
  validateCertificate,
  validateCertificateComparison,
} = require('../middleware/validation');
const { parseJsonIfNeeded } = require('../utils/certificatePayload');
const { buildInstitutionScopedFilter, canUserAccessInstitution } = require('../utils/institutionScope');
const CertificateService = require('../services/certificate_service');

const router = express.Router();
const certificateService = new CertificateService();

const DEFAULT_LIST_LIMIT = 10;
const MAX_LIST_LIMIT = 100;
const TRUSTED_UPLOAD_ROLES = ['admin', 'institution_admin', 'university_admin'];
const VALIDATION_ROLES = ['admin', 'institution_admin', 'university_admin', 'company_admin', 'verifier'];
const MANUAL_VERIFY_ROLES = ['admin', 'verifier', 'company_admin'];

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

  return buildInstitutionScopedFilter(filter, user);
};

const canAccessCertificateForUser = async (user, certificate) =>
  canUserAccessInstitution(user, certificate.institutionId?._id || certificate.institutionId);

const sendServiceError = (res, error, fallbackMessage) => {
  if (error?.statusCode) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  if (error?.code === 11000) {
    return res.status(400).json({ message: 'Certificate ID or certificate hash already exists' });
  }

  return res.status(500).json({ message: fallbackMessage });
};

const buildRequestDetails = (req) => ({
  ipAddress: req.ip,
  userAgent: req.get('User-Agent'),
});

router.post(
  '/verify',
  auth,
  authorize(...TRUSTED_UPLOAD_ROLES),
  uploadSingle,
  normalizeCertificateRequest,
  validateCertificate,
  async (req, res) => {
    try {
      const result = await certificateService.uploadAndVerify(
        req.file,
        req.user,
        req.body,
        buildRequestDetails(req)
      );
      res.status(201).json(result);
    } catch (error) {
      console.error('Certificate upload error:', error);
      sendServiceError(res, error, 'Server error during certificate upload');
    }
  }
);

router.post(
  '/bulk',
  auth,
  authorize(...TRUSTED_UPLOAD_ROLES),
  uploadMultiple,
  async (req, res) => {
    try {
      const records = parseJsonIfNeeded(req.body.records, []);
      const result = await certificateService.createBulkTrustedCertificates(req.files, records, req.user);
      res.status(201).json(result);
    } catch (error) {
      console.error('Bulk upload error:', error);
      sendServiceError(res, error, 'Server error during bulk upload');
    }
  }
);

router.post(
  '/validate',
  auth,
  authorize(...VALIDATION_ROLES),
  uploadSingle,
  normalizeCertificateComparisonRequest,
  validateCertificateComparison,
  async (req, res) => {
    try {
      const result = await certificateService.compareCandidateCertificate(
        req.body,
        req.user,
        req.file,
        buildRequestDetails(req)
      );

      res.json(result);
    } catch (error) {
      console.error('Candidate certificate validation error:', error);
      sendServiceError(res, error, 'Server error during certificate validation');
    }
  }
);

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

router.put('/:id/verify', auth, authorize(...MANUAL_VERIFY_ROLES), async (req, res) => {
  try {
    const result = await certificateService.updateVerificationStatus(
      req.params.id,
      req.body,
      req.user,
      buildRequestDetails(req)
    );

    res.json(result);
  } catch (error) {
    console.error('Update verification error:', error);
    sendServiceError(res, error, 'Server error');
  }
});

module.exports = router;
