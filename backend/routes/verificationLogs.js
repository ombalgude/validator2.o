const express = require('express');
const VerificationLog = require('../models/VerificationLog');
const { auth, authorize } = require('../middleware/auth');
const { buildInstitutionScopedFilter, canUserAccessInstitution } = require('../utils/institutionScope');

const router = express.Router();

const parseLimit = (value) => Math.min(parseInt(value, 10) || 10, 100);

const buildLogFilter = async (query, user) => {
  const filter = {};

  if (query.certificateId) {
    filter.certificateId = query.certificateId;
  }

  if (query.verifiedBy) {
    filter.verifiedBy = query.verifiedBy;
  }

  if (query.institutionId) {
    filter.institutionId = query.institutionId;
  }

  if (query.result) {
    filter.result = query.result;
  }

  if (query.verificationMethod) {
    filter.verificationMethod = query.verificationMethod;
  }

  return buildInstitutionScopedFilter(filter, user);
};

const canAccessLog = (log, user) => canUserAccessInstitution(user, log.institutionId?._id || log.institutionId);

router.get('/', auth, authorize('admin', 'verifier', 'company_admin', 'institution_admin', 'university_admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseLimit(req.query.limit);
    const filter = await buildLogFilter(req.query, req.user);

    const logs = await VerificationLog.find(filter)
      .populate('certificateId', 'certificateId studentName verificationStatus certificateHash')
      .populate('verifiedBy', 'email fullName role')
      .populate('institutionId', 'name code institutionType')
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await VerificationLog.countDocuments(filter);

    res.json({
      logs,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List verification logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', auth, authorize('admin', 'verifier', 'company_admin', 'institution_admin', 'university_admin'), async (req, res) => {
  try {
    const log = await VerificationLog.findById(req.params.id)
      .populate('certificateId', 'certificateId studentName verificationStatus certificateHash')
      .populate('verifiedBy', 'email fullName role')
      .populate('institutionId', 'name code institutionType');

    if (!log) {
      return res.status(404).json({ message: 'Verification log not found' });
    }

    if (!(await canAccessLog(log, req.user))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(log);
  } catch (error) {
    console.error('Get verification log error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
