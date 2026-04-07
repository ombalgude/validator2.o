const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Institution = require('../models/Institution');
const InstitutionAdmin = require('../models/Institution_admin');
const UniversityAdmin = require('../models/univercity_admin');
const CompanyAdmin = require('../models/company_admin');
const Verifier = require('../models/Verifier');
const { auth, authorize } = require('../middleware/auth');
const { applyUserAccessProfile, clearUserAccessState } = require('../utils/userAccessProfile');

const router = express.Router();

const PROFILE_CONFIG = {
  'institution-admins': {
    label: 'Institution admin',
    role: 'institution_admin',
    model: InstitutionAdmin,
    allowedFields: ['userId', 'institutionId', 'adminCode', 'department', 'title', 'canIssueCertificates', 'permissions', 'isActive'],
    requiredFields: ['userId', 'institutionId'],
    institutionField: 'institutionId',
    populate: [
      { path: 'userId', select: 'email fullName role institutionId companyName isActive permissions' },
      { path: 'institutionId', select: 'name code institutionType isVerified' },
    ],
    syncUser: (user, profile) => {
      user.role = 'institution_admin';
      user.institutionId = profile.institutionId;
    },
  },
  'university-admins': {
    label: 'University admin',
    role: 'university_admin',
    model: UniversityAdmin,
    allowedFields: ['userId', 'institutionId', 'adminCode', 'department', 'title', 'permissions', 'canApproveInstitutionAdmins', 'isActive'],
    requiredFields: ['userId', 'institutionId'],
    institutionField: 'institutionId',
    populate: [
      { path: 'userId', select: 'email fullName role institutionId companyName isActive permissions' },
      { path: 'institutionId', select: 'name code institutionType isVerified' },
    ],
    syncUser: (user, profile) => {
      user.role = 'university_admin';
      user.institutionId = profile.institutionId;
    },
  },
  'company-admins': {
    label: 'Company admin',
    role: 'company_admin',
    model: CompanyAdmin,
    allowedFields: ['userId', 'companyName', 'companyCode', 'institutionIds', 'accessScope', 'permissions', 'isActive'],
    requiredFields: ['userId', 'companyName'],
    institutionArrayField: 'institutionIds',
    populate: [
      { path: 'userId', select: 'email fullName role institutionId companyName isActive permissions' },
      { path: 'institutionIds', select: 'name code institutionType isVerified' },
    ],
    syncUser: (user, profile) => {
      user.role = 'company_admin';
      user.companyName = profile.companyName;
    },
  },
  verifiers: {
    label: 'Verifier',
    role: 'verifier',
    model: Verifier,
    allowedFields: ['userId', 'organizationName', 'verifierType', 'assignedInstitutionIds', 'accessLevel', 'lastVerifiedAt', 'isActive'],
    requiredFields: ['userId'],
    institutionArrayField: 'assignedInstitutionIds',
    populate: [
      { path: 'userId', select: 'email fullName role institutionId companyName isActive permissions' },
      { path: 'assignedInstitutionIds', select: 'name code institutionType isVerified' },
    ],
    syncUser: (user) => {
      user.role = 'verifier';
    },
  },
};

const BOOLEAN_FIELDS = new Set(['canIssueCertificates', 'canApproveInstitutionAdmins', 'isActive']);
const DATE_FIELDS = new Set(['lastVerifiedAt']);
const ARRAY_ID_FIELDS = new Set(['institutionIds', 'assignedInstitutionIds']);
const ARRAY_STRING_FIELDS = new Set(['permissions']);
const SINGLE_ID_FIELDS = new Set(['userId', 'institutionId']);

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

const parseDate = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toTrimmedString = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

const parseArrayValue = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (_error) {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }

  return [];
};

const sanitizePayload = (config, body) => {
  const payload = {};

  config.allowedFields.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(body, field)) {
      return;
    }

    const value = body[field];

    if (BOOLEAN_FIELDS.has(field)) {
      const parsedBoolean = parseBoolean(value);
      if (parsedBoolean !== undefined) {
        payload[field] = parsedBoolean;
      }
      return;
    }

    if (DATE_FIELDS.has(field)) {
      payload[field] = parseDate(value);
      return;
    }

    if (ARRAY_ID_FIELDS.has(field)) {
      payload[field] = parseArrayValue(value).filter((item) => mongoose.Types.ObjectId.isValid(item));
      return;
    }

    if (ARRAY_STRING_FIELDS.has(field)) {
      payload[field] = parseArrayValue(value)
        .map((item) => toTrimmedString(item))
        .filter(Boolean);
      return;
    }

    if (SINGLE_ID_FIELDS.has(field)) {
      if (value === null || value === '') {
        payload[field] = null;
      } else if (mongoose.Types.ObjectId.isValid(value)) {
        payload[field] = value;
      }
      return;
    }

    payload[field] = field.toLowerCase().endsWith('code')
      ? toTrimmedString(value).toUpperCase()
      : toTrimmedString(value);
  });

  return payload;
};

const applyPopulation = (query, populate) => {
  populate.forEach((entry) => query.populate(entry));
  return query;
};

const buildListFilter = (config, query) => {
  const filter = {};

  if (query.userId && mongoose.Types.ObjectId.isValid(query.userId)) {
    filter.userId = query.userId;
  }

  if (query.isActive !== undefined) {
    const isActive = parseBoolean(query.isActive);
    if (isActive !== undefined) {
      filter.isActive = isActive;
    }
  }

  if (config.institutionField && query.institutionId && mongoose.Types.ObjectId.isValid(query.institutionId)) {
    filter[config.institutionField] = query.institutionId;
  }

  if (config.institutionArrayField && query.institutionId && mongoose.Types.ObjectId.isValid(query.institutionId)) {
    filter[config.institutionArrayField] = query.institutionId;
  }

  if (query.adminCode && config.allowedFields.includes('adminCode')) {
    filter.adminCode = toTrimmedString(query.adminCode).toUpperCase();
  }

  if (query.companyName && config.allowedFields.includes('companyName')) {
    filter.companyName = { $regex: query.companyName, $options: 'i' };
  }

  if (query.verifierType && config.allowedFields.includes('verifierType')) {
    filter.verifierType = query.verifierType;
  }

  if (query.accessScope && config.allowedFields.includes('accessScope')) {
    filter.accessScope = query.accessScope;
  }

  return filter;
};

const validateRequiredFields = (config, payload) => {
  const missingFields = config.requiredFields.filter((field) => {
    const value = payload[field];

    if (Array.isArray(value)) {
      return value.length === 0;
    }

    return value === undefined || value === null || value === '';
  });

  return missingFields;
};

const validateInstitutionsExist = async (config, payload) => {
  const institutionIds = [];

  if (config.institutionField && payload[config.institutionField]) {
    institutionIds.push(payload[config.institutionField]);
  }

  if (config.institutionArrayField && Array.isArray(payload[config.institutionArrayField])) {
    institutionIds.push(...payload[config.institutionArrayField]);
  }

  const uniqueIds = [...new Set(institutionIds.map(String))];
  if (uniqueIds.length === 0) {
    return;
  }

  const count = await Institution.countDocuments({ _id: { $in: uniqueIds } });
  if (count !== uniqueIds.length) {
    throw new Error('One or more institutions were not found');
  }
};

const getConfig = (type) => PROFILE_CONFIG[type] || null;

const getOwnProfile = async (config, userId) => {
  let query = config.model.findOne({ userId });
  query = applyPopulation(query, config.populate);
  return query;
};

router.get('/:type/me', auth, async (req, res) => {
  try {
    const config = getConfig(req.params.type);
    if (!config) {
      return res.status(404).json({ message: 'Profile route not found' });
    }

    if (req.user.role !== config.role && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const profile = await getOwnProfile(config, req.user._id);
    if (!profile) {
      return res.status(404).json({ message: `${config.label} profile not found` });
    }

    res.json(profile);
  } catch (error) {
    console.error('Get own profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:type', auth, authorize('admin'), async (req, res) => {
  try {
    const config = getConfig(req.params.type);
    if (!config) {
      return res.status(404).json({ message: 'Profile route not found' });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
    const filter = buildListFilter(config, req.query);

    let query = config.model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
    query = applyPopulation(query, config.populate);
    const profiles = await query;
    const total = await config.model.countDocuments(filter);

    res.json({
      profiles,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List profiles error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:type', auth, authorize('admin'), async (req, res) => {
  try {
    const config = getConfig(req.params.type);
    if (!config) {
      return res.status(404).json({ message: 'Profile route not found' });
    }

    const payload = sanitizePayload(config, req.body);
    const missingFields = validateRequiredFields(config, payload);
    if (missingFields.length > 0) {
      return res.status(400).json({ message: `Missing required fields: ${missingFields.join(', ')}` });
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await validateInstitutionsExist(config, payload);

    const profile = new config.model(payload);
    await profile.save();

    applyUserAccessProfile(user, config, profile);
    await user.save();

    let createdProfile = config.model.findById(profile._id);
    createdProfile = applyPopulation(createdProfile, config.populate);

    res.status(201).json({
      message: `${config.label} profile created successfully`,
      profile: await createdProfile,
    });
  } catch (error) {
    console.error('Create profile error:', error);
    if (error?.code === 11000) {
      return res.status(400).json({ message: 'Profile already exists for this user or code is already in use' });
    }
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

router.get('/:type/:id', auth, async (req, res) => {
  try {
    const config = getConfig(req.params.type);
    if (!config) {
      return res.status(404).json({ message: 'Profile route not found' });
    }

    let query = config.model.findById(req.params.id);
    query = applyPopulation(query, config.populate);
    const profile = await query;

    if (!profile) {
      return res.status(404).json({ message: `${config.label} profile not found` });
    }

    if (req.user.role !== 'admin' && String(profile.userId?._id || profile.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(profile);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:type/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const config = getConfig(req.params.type);
    if (!config) {
      return res.status(404).json({ message: 'Profile route not found' });
    }

    const profile = await config.model.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ message: `${config.label} profile not found` });
    }

    const payload = sanitizePayload(config, req.body);
    delete payload.userId;

    await validateInstitutionsExist(config, payload);

    Object.assign(profile, payload);
    await profile.save();

    const user = await User.findById(profile.userId);
    if (user) {
      applyUserAccessProfile(user, config, profile);
      await user.save();
    }

    let updatedProfile = config.model.findById(profile._id);
    updatedProfile = applyPopulation(updatedProfile, config.populate);

    res.json({
      message: `${config.label} profile updated successfully`,
      profile: await updatedProfile,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    if (error?.code === 11000) {
      return res.status(400).json({ message: 'Code is already in use' });
    }
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

router.delete('/:type/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const config = getConfig(req.params.type);
    if (!config) {
      return res.status(404).json({ message: 'Profile route not found' });
    }

    const profile = await config.model.findByIdAndDelete(req.params.id);
    if (!profile) {
      return res.status(404).json({ message: `${config.label} profile not found` });
    }

    const user = await User.findById(profile.userId);
    if (user && user.role === config.role) {
      clearUserAccessState(user);
      await user.save();
    }

    res.json({ message: `${config.label} profile deleted successfully` });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
