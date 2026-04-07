const Institution = require('../models/Institution');
const CompanyAdmin = require('../models/company_admin');
const Verifier = require('../models/Verifier');

const normalizeInstitutionId = (value) => {
  if (!value) {
    return '';
  }

  return String(value._id || value).trim();
};

const normalizeInstitutionIds = (values = []) => [...new Set(
  values
    .map(normalizeInstitutionId)
    .filter(Boolean)
)];

const extractRequestedInstitutionIds = (value) => {
  if (value === undefined) {
    return null;
  }

  if (value && typeof value === 'object' && Array.isArray(value.$in)) {
    return normalizeInstitutionIds(value.$in);
  }

  return normalizeInstitutionIds([value]);
};

const mergeInstitutionScopeIntoFilter = (filter, accessibleInstitutionIds, field = 'institutionId') => {
  if (accessibleInstitutionIds === null) {
    return filter;
  }

  const allowedIds = normalizeInstitutionIds(accessibleInstitutionIds);
  const requestedIds = extractRequestedInstitutionIds(filter[field]);
  const scopedIds = requestedIds
    ? allowedIds.filter((id) => requestedIds.includes(id))
    : allowedIds;

  filter[field] = { $in: scopedIds };
  return filter;
};

const getAccessibleInstitutionIds = async (user) => {
  if (!user) {
    return [];
  }

  if (user.role === 'admin') {
    return null;
  }

  if (user.role === 'institution_admin' || user.role === 'university_admin') {
    return normalizeInstitutionIds([user.institutionId]);
  }

  if (user.role === 'company_admin') {
    const companyAdminProfile = await CompanyAdmin.findOne({ userId: user._id, isActive: true }).lean();

    if (!companyAdminProfile) {
      return [];
    }

    if (companyAdminProfile.accessScope === 'all_verified_institutions') {
      const verifiedInstitutionIds = await Institution.find({ isVerified: true }).distinct('_id');
      return normalizeInstitutionIds(verifiedInstitutionIds);
    }

    return normalizeInstitutionIds(companyAdminProfile.institutionIds || []);
  }

  if (user.role === 'verifier') {
    const verifierProfile = await Verifier.findOne({ userId: user._id, isActive: true }).lean();

    if (!verifierProfile) {
      return [];
    }

    if (verifierProfile.verifierType === 'internal') {
      return null;
    }

    return normalizeInstitutionIds(verifierProfile.assignedInstitutionIds || []);
  }

  return [];
};

const buildInstitutionScopedFilter = async (filter, user, field = 'institutionId') => {
  const accessibleInstitutionIds = await getAccessibleInstitutionIds(user);
  return mergeInstitutionScopeIntoFilter(filter, accessibleInstitutionIds, field);
};

const canUserAccessInstitution = async (user, institutionId) => {
  const accessibleInstitutionIds = await getAccessibleInstitutionIds(user);

  if (accessibleInstitutionIds === null) {
    return true;
  }

  return accessibleInstitutionIds.includes(normalizeInstitutionId(institutionId));
};

module.exports = {
  buildInstitutionScopedFilter,
  canUserAccessInstitution,
  getAccessibleInstitutionIds,
  mergeInstitutionScopeIntoFilter,
  normalizeInstitutionId,
  normalizeInstitutionIds,
};
