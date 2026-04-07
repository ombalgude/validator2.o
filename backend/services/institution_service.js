/**
 * Institution Service
 * Handles business logic for institution operations
 */

const Institution = require('../models/Institution');
const Certificate = require('../models/Certificate');

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

const getIdValue = (value) => value?._id || value || null;

class InstitutionService {
  async createInstitution(institutionData, user) {
    try {
      if (!this.canModifyInstitution(user)) {
        throw new Error('Access denied');
      }

      const code = String(institutionData.code || '').trim().toUpperCase();
      const existingInstitution = await Institution.findOne({ code });

      if (existingInstitution) {
        throw new Error('Institution code already exists');
      }

      const institution = new Institution({
        ...institutionData,
        code,
        isVerified: false,
        totalCertificates: 0,
        createdBy: user._id,
        updatedBy: user._id,
      });

      await institution.save();

      return {
        success: true,
        institution: this.formatInstitutionForResponse(institution),
        message: 'Institution created successfully',
      };
    } catch (error) {
      console.error('Error in createInstitution:', error);
      throw new Error(`Failed to create institution: ${error.message}`);
    }
  }

  async getInstitution(institutionId, user) {
    try {
      const institution = await Institution.findById(institutionId)
        .populate('createdBy', 'email fullName role')
        .populate('updatedBy', 'email fullName role')
        .populate('verifiedBy', 'email fullName role');

      if (!institution) {
        throw new Error('Institution not found');
      }

      if (!this.canAccessInstitution(institution, user)) {
        throw new Error('Access denied');
      }

      return {
        success: true,
        institution: this.formatInstitutionForResponse(institution),
      };
    } catch (error) {
      console.error('Error in getInstitution:', error);
      throw new Error(`Failed to retrieve institution: ${error.message}`);
    }
  }

  async getInstitutions(filters = {}, user, pagination = {}) {
    try {
      const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc' } = pagination;
      const skip = (page - 1) * limit;
      const query = this.buildInstitutionQuery(filters, user);

      const institutions = await Institution.find(query)
        .populate('createdBy', 'email fullName role')
        .populate('updatedBy', 'email fullName role')
        .populate('verifiedBy', 'email fullName role')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(limit);

      const total = await Institution.countDocuments(query);

      return {
        success: true,
        institutions: institutions.map((institution) => this.formatInstitutionForResponse(institution)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error in getInstitutions:', error);
      throw new Error(`Failed to retrieve institutions: ${error.message}`);
    }
  }

  async updateInstitution(institutionId, updateData, user) {
    try {
      const institution = await Institution.findById(institutionId);

      if (!institution) {
        throw new Error('Institution not found');
      }

      if (!this.canModifyInstitution(user)) {
        throw new Error('Access denied');
      }

      Object.assign(institution, updateData, {
        updatedBy: user._id,
      });

      await institution.save();

      return {
        success: true,
        institution: this.formatInstitutionForResponse(institution),
        message: 'Institution updated successfully',
      };
    } catch (error) {
      console.error('Error in updateInstitution:', error);
      throw new Error(`Failed to update institution: ${error.message}`);
    }
  }

  async deleteInstitution(institutionId, user) {
    try {
      const institution = await Institution.findById(institutionId);

      if (!institution) {
        throw new Error('Institution not found');
      }

      if (!this.canModifyInstitution(user)) {
        throw new Error('Access denied');
      }

      const certificateCount = await Certificate.countDocuments({ institutionId });
      if (certificateCount > 0) {
        throw new Error('Cannot delete institution with existing certificates');
      }

      await Institution.findByIdAndDelete(institutionId);

      return {
        success: true,
        message: 'Institution deleted successfully',
      };
    } catch (error) {
      console.error('Error in deleteInstitution:', error);
      throw new Error(`Failed to delete institution: ${error.message}`);
    }
  }

  async verifyInstitution(institutionId, user, verificationInput = true, fallbackReason = '') {
    try {
      const institution = await Institution.findById(institutionId);

      if (!institution) {
        throw new Error('Institution not found');
      }

      if (!this.canModifyInstitution(user)) {
        throw new Error('Only admins can verify institutions');
      }

      const { isVerified, reason } = this.normalizeVerificationInput(verificationInput, fallbackReason);

      institution.isVerified = isVerified;
      institution.updatedBy = user._id;
      institution.verificationReason = reason;
      institution.verifiedBy = isVerified ? user._id : null;
      institution.verifiedAt = isVerified ? new Date() : null;

      await institution.save();

      return {
        success: true,
        institution: this.formatInstitutionForResponse(institution),
        message: `Institution ${isVerified ? 'verified' : 'unverified'} successfully`,
      };
    } catch (error) {
      console.error('Error in verifyInstitution:', error);
      throw new Error(`Failed to verify institution: ${error.message}`);
    }
  }

  async getInstitutionStats(institutionId, user) {
    try {
      const institution = await Institution.findById(institutionId)
        .populate('createdBy', 'email fullName role')
        .populate('updatedBy', 'email fullName role')
        .populate('verifiedBy', 'email fullName role');

      if (!institution) {
        throw new Error('Institution not found');
      }

      if (!this.canAccessInstitution(institution, user)) {
        throw new Error('Access denied');
      }

      const certificateStats = await Certificate.aggregate([
        { $match: { institutionId: institution._id } },
        {
          $group: {
            _id: '$verificationStatus',
            count: { $sum: 1 },
          },
        },
      ]);

      const monthlyStats = await Certificate.aggregate([
        { $match: { institutionId: institution._id } },
        {
          $group: {
            _id: {
              year: { $year: '$uploadedAt' },
              month: { $month: '$uploadedAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 },
      ]);

      const totalCertificates = await Certificate.countDocuments({ institutionId: institution._id });
      const verifiedCount = await Certificate.countDocuments({
        institutionId: institution._id,
        verificationStatus: 'verified',
      });

      const verificationRate = totalCertificates > 0
        ? (verifiedCount / totalCertificates) * 100
        : 0;

      return {
        success: true,
        statistics: {
          totalCertificates,
          verificationRate: Math.round(verificationRate * 100) / 100,
          statusBreakdown: certificateStats.reduce((accumulator, stat) => {
            accumulator[stat._id] = stat.count;
            return accumulator;
          }, {}),
          monthlyUploads: monthlyStats,
          institution: this.formatInstitutionForResponse(institution),
        },
      };
    } catch (error) {
      console.error('Error in getInstitutionStats:', error);
      throw new Error(`Failed to get institution statistics: ${error.message}`);
    }
  }

  async searchInstitutions(search, user, pagination = {}) {
    try {
      const filters = {
        ...(pagination.filters || {}),
        search,
      };

      const result = await this.getInstitutions(filters, user, pagination);

      return {
        ...result,
        query: search,
      };
    } catch (error) {
      console.error('Error in searchInstitutions:', error);
      throw new Error(`Failed to search institutions: ${error.message}`);
    }
  }

  canAccessInstitution(institution, user) {
    if (!user?.role) {
      return false;
    }

    if (user.role === 'institution_admin' || user.role === 'university_admin') {
      return String(user.institutionId || '') === String(getIdValue(institution));
    }

    return true;
  }

  canModifyInstitution(user) {
    return user?.role === 'admin';
  }

  buildInstitutionQuery(filters = {}, user = {}) {
    const query = {};
    const verified = filters.verified !== undefined ? parseBoolean(filters.verified) : parseBoolean(filters.isVerified);

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { code: { $regex: filters.search, $options: 'i' } },
      ];
    }

    if (verified !== undefined) {
      query.isVerified = verified;
    }

    if (filters.institutionType) {
      query.institutionType = filters.institutionType;
    }

    if (filters.parentInstitutionId) {
      query.parentInstitutionId = filters.parentInstitutionId;
    }

    if (filters.establishedYear) {
      query.establishedYear = filters.establishedYear;
    }

    if (filters.city) {
      query['address.city'] = { $regex: filters.city, $options: 'i' };
    }

    if (filters.state) {
      query['address.state'] = { $regex: filters.state, $options: 'i' };
    }

    if (filters.country) {
      query['address.country'] = { $regex: filters.country, $options: 'i' };
    }

    if ((user.role === 'institution_admin' || user.role === 'university_admin') && user.institutionId) {
      query._id = user.institutionId;
    }

    return query;
  }

  normalizeVerificationInput(verificationInput, fallbackReason = '') {
    if (typeof verificationInput === 'object' && verificationInput !== null) {
      return {
        isVerified: verificationInput.isVerified !== undefined ? Boolean(verificationInput.isVerified) : true,
        reason: typeof verificationInput.reason === 'string' ? verificationInput.reason.trim() : '',
      };
    }

    if (typeof verificationInput === 'boolean') {
      return {
        isVerified: verificationInput,
        reason: typeof fallbackReason === 'string' ? fallbackReason.trim() : '',
      };
    }

    return {
      isVerified: true,
      reason: typeof verificationInput === 'string' ? verificationInput.trim() : '',
    };
  }

  formatInstitutionForResponse(institution) {
    const createdBy = institution.createdBy
      ? {
          id: getIdValue(institution.createdBy),
          email: institution.createdBy.email || '',
          fullName: institution.createdBy.fullName || '',
          role: institution.createdBy.role || '',
        }
      : null;

    const updatedBy = institution.updatedBy
      ? {
          id: getIdValue(institution.updatedBy),
          email: institution.updatedBy.email || '',
          fullName: institution.updatedBy.fullName || '',
          role: institution.updatedBy.role || '',
        }
      : null;

    const verifiedBy = institution.verifiedBy
      ? {
          id: getIdValue(institution.verifiedBy),
          email: institution.verifiedBy.email || '',
          fullName: institution.verifiedBy.fullName || '',
          role: institution.verifiedBy.role || '',
        }
      : null;

    return {
      id: institution._id,
      name: institution.name,
      code: institution.code,
      institutionType: institution.institutionType,
      parentInstitutionId: getIdValue(institution.parentInstitutionId),
      address: institution.address,
      contactInfo: institution.contactInfo,
      officialDomains: institution.officialDomains,
      isVerified: institution.isVerified,
      establishedYear: institution.establishedYear,
      accreditation: institution.accreditation,
      apiEndpoint: institution.apiEndpoint,
      certificateTemplates: institution.certificateTemplates,
      totalCertificates: institution.totalCertificates,
      createdBy,
      updatedBy,
      verifiedBy,
      createdAt: institution.createdAt,
      updatedAt: institution.updatedAt,
      verifiedAt: institution.verifiedAt,
      verificationReason: institution.verificationReason,
    };
  }
}

module.exports = InstitutionService;
