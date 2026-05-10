const mongoose = require('mongoose');
const Institution = require('../models/Institution');
const User = require('../models/User');
const UniversityAdmin = require('../models/UniversityAdmin');
const UniversityAdminRequest = require('../models/UniversityAdminRequest');

const VALID_STATUSES = new Set(['pending', 'approved', 'rejected']);

const toText = (value) => (value === null || value === undefined ? '' : String(value).trim());

const parsePage = (value) => Math.max(parseInt(value, 10) || 1, 1);

const parseLimit = (value) => Math.min(Math.max(parseInt(value, 10) || 10, 1), 100);

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const escapeRegex = (value) => toText(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildInstitutionCodeBase = (name) => {
  const normalized = toText(name)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);

  return normalized.length >= 2 ? normalized : 'UNI';
};

const generateUniqueInstitutionCode = async (name) => {
  const baseCode = buildInstitutionCodeBase(name);

  if (!(await Institution.exists({ code: baseCode }))) {
    return baseCode;
  }

  for (let index = 2; index <= 999; index += 1) {
    const suffix = `_${index}`;
    const candidate = `${baseCode.slice(0, 20 - suffix.length)}${suffix}`;

    if (!(await Institution.exists({ code: candidate }))) {
      return candidate;
    }
  }

  const error = new Error('Unable to generate a unique university code for this request.');
  error.statusCode = 500;
  throw error;
};

const applyRequestPopulation = (query) =>
  query
    .populate('userId', 'email fullName role institutionId companyName isActive permissions')
    .populate('institutionId', 'name code institutionType isVerified')
    .populate('reviewedBy', 'email fullName role')
    .populate('approvedProfileId', 'adminCode department title isActive');

const buildListFilter = (query) => {
  const filter = {};

  if (VALID_STATUSES.has(query.status)) {
    filter.status = query.status;
  }

  if (query.search) {
    const search = toText(query.search);
    filter.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { universityName: { $regex: search, $options: 'i' } },
    ];
  }

  return filter;
};

const getRequestStatusCounts = async () => {
  const counts = await UniversityAdminRequest.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  return counts.reduce(
    (accumulator, entry) => ({
      ...accumulator,
      [entry._id]: entry.count,
    }),
    {
      pending: 0,
      approved: 0,
      rejected: 0,
    }
  );
};

const findPopulatedRequestById = (id) => applyRequestPopulation(UniversityAdminRequest.findById(id));

const verifyInstitutionForApproval = async (institution, request, reviewer, reason) => {
  institution.isVerified = true;
  institution.updatedBy = reviewer._id;
  institution.verifiedBy = reviewer._id;
  institution.verifiedAt = institution.verifiedAt || new Date();
  institution.verificationReason = institution.verificationReason || reason;
  if (!institution.contactInfo?.email && request.email) {
    institution.contactInfo = {
      ...(institution.contactInfo || {}),
      email: request.email,
    };
  }
  await institution.save();
  return institution;
};

const resolveApprovalInstitution = async (request, reviewer) => {
  if (request.institutionId && isValidObjectId(request.institutionId)) {
    const existingById = await Institution.findById(request.institutionId);
    if (existingById) {
      return verifyInstitutionForApproval(
        existingById,
        request,
        reviewer,
        'Verified during university admin approval.'
      );
    }
  }

  const universityName = toText(request.universityName);
  if (!universityName) {
    const error = new Error('University name is required before approving this request.');
    error.statusCode = 400;
    throw error;
  }

  const existingByName = await Institution.findOne({
    name: { $regex: `^${escapeRegex(universityName)}$`, $options: 'i' },
    institutionType: 'university',
  });

  if (existingByName) {
    return verifyInstitutionForApproval(
      existingByName,
      request,
      reviewer,
      'Verified during university admin approval.'
    );
  }

  const institution = new Institution({
    name: universityName,
    code: await generateUniqueInstitutionCode(universityName),
    institutionType: 'university',
    contactInfo: {
      email: request.email,
    },
    isVerified: true,
    createdBy: reviewer._id,
    updatedBy: reviewer._id,
    verifiedBy: reviewer._id,
    verifiedAt: new Date(),
    verificationReason: 'Created and verified during university admin approval.',
  });

  await institution.save();
  return institution;
};

const buildProfilePayload = (request, institution, body) => ({
  userId: request.userId,
  institutionId: institution._id,
  adminCode: toText(body.adminCode) || request.adminCode || undefined,
  department: toText(body.department) || request.department || '',
  title: toText(body.title) || request.title || 'University Admin',
  canApproveInstitutionAdmins: true,
  isActive: true,
});

const syncUserForApprovedUniversityAdmin = async (user, institution) => {
  user.role = 'university_admin';
  user.institutionId = institution._id;
  user.companyName = '';
  user.isActive = true;
  await user.save();
};

const updateRequestReviewState = (request, status, reviewer, body) => {
  request.status = status;
  request.reviewedBy = reviewer._id;
  request.reviewedAt = new Date();
  request.reviewNote = toText(body.reviewNote);
};

const sendControllerError = (res, error, fallbackMessage) => {
  if (error?.statusCode) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  if (error?.code === 11000) {
    return res.status(400).json({
      message: 'A university admin profile already exists for this user or admin code.',
    });
  }

  console.error('University admin request controller error:', error);
  return res.status(500).json({ message: fallbackMessage });
};

const listUniversityAdminRequests = async (req, res) => {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const filter = buildListFilter(req.query);

    const [requests, total, statusCounts] = await Promise.all([
      applyRequestPopulation(
        UniversityAdminRequest.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
      ),
      UniversityAdminRequest.countDocuments(filter),
      getRequestStatusCounts(),
    ]);

    res.json({
      requests,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      statusCounts,
    });
  } catch (error) {
    sendControllerError(res, error, 'Unable to load university admin requests.');
  }
};

const approveUniversityAdminRequest = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid request ID.' });
    }

    const request = await UniversityAdminRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'University admin request not found.' });
    }

    if (request.status !== 'pending') {
      return res.status(409).json({ message: `Only pending requests can be approved. This request is ${request.status}.` });
    }

    const [institution, user] = await Promise.all([
      resolveApprovalInstitution(request, req.user),
      User.findById(request.userId),
    ]);

    if (!user) {
      return res.status(404).json({ message: 'Request user was not found.' });
    }

    const profilePayload = buildProfilePayload(request, institution, req.body || {});
    let profile = await UniversityAdmin.findOne({ userId: request.userId });

    if (profile) {
      Object.assign(profile, profilePayload);
    } else {
      profile = new UniversityAdmin(profilePayload);
    }

    await profile.save();
    await syncUserForApprovedUniversityAdmin(user, institution);

    request.institutionId = institution._id;
    request.approvedProfileId = profile._id;
    updateRequestReviewState(request, 'approved', req.user, req.body || {});
    await request.save();

    res.json({
      message: 'University admin request approved successfully.',
      request: await findPopulatedRequestById(request._id),
      profile,
    });
  } catch (error) {
    sendControllerError(res, error, 'Unable to approve university admin request.');
  }
};

const rejectUniversityAdminRequest = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid request ID.' });
    }

    const request = await UniversityAdminRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'University admin request not found.' });
    }

    if (request.status !== 'pending') {
      return res.status(409).json({ message: `Only pending requests can be rejected. This request is ${request.status}.` });
    }

    const user = await User.findById(request.userId);
    if (user) {
      user.institutionId = null;
      user.companyName = '';
      user.isActive = false;
      await user.save();
    }

    updateRequestReviewState(request, 'rejected', req.user, req.body || {});
    await request.save();

    res.json({
      message: 'University admin request rejected.',
      request: await findPopulatedRequestById(request._id),
    });
  } catch (error) {
    sendControllerError(res, error, 'Unable to reject university admin request.');
  }
};

module.exports = {
  listUniversityAdminRequests,
  approveUniversityAdminRequest,
  rejectUniversityAdminRequest,
};
