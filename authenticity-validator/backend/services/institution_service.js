/**
 * Institution Service
 * Handles business logic for institution operations
 */

const Institution = require('../models/Institution');
const Certificate = require('../models/Certificate');

class InstitutionService {
    /**
     * Create a new institution
     * @param {Object} institutionData - Institution data
     * @param {Object} user - User creating the institution
     * @returns {Promise<Object>} Created institution
     */
    async createInstitution(institutionData, user) {
        try {
            // Check if institution code already exists
            const existingInstitution = await Institution.findOne({ 
                code: institutionData.code 
            });

            if (existingInstitution) {
                throw new Error('Institution code already exists');
            }

            // Create institution
            const institution = new Institution({
                ...institutionData,
                isVerified: false,
                totalCertificates: 0,
                createdBy: user._id,
                createdAt: new Date()
            });

            await institution.save();

            return {
                success: true,
                institution: this.formatInstitutionForResponse(institution),
                message: 'Institution created successfully'
            };

        } catch (error) {
            console.error('Error in createInstitution:', error);
            throw new Error(`Failed to create institution: ${error.message}`);
        }
    }

    /**
     * Get institution by ID
     * @param {string} institutionId - Institution ID
     * @param {Object} user - User requesting the institution
     * @returns {Promise<Object>} Institution data
     */
    async getInstitution(institutionId, user) {
        try {
            const institution = await Institution.findById(institutionId);

            if (!institution) {
                throw new Error('Institution not found');
            }

            // Check permissions
            if (!this.canAccessInstitution(institution, user)) {
                throw new Error('Access denied');
            }

            return {
                success: true,
                institution: this.formatInstitutionForResponse(institution)
            };

        } catch (error) {
            console.error('Error in getInstitution:', error);
            throw new Error(`Failed to retrieve institution: ${error.message}`);
        }
    }

    /**
     * Get all institutions with filtering and pagination
     * @param {Object} filters - Filter criteria
     * @param {Object} user - User requesting institutions
     * @param {Object} pagination - Pagination options
     * @returns {Promise<Object>} Paginated institution list
     */
    async getInstitutions(filters = {}, user, pagination = {}) {
        try {
            const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
            const skip = (page - 1) * limit;

            // Build query
            const query = this.buildInstitutionQuery(filters, user);

            const institutions = await Institution.find(query)
                .populate('createdBy', 'email role')
                .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
                .skip(skip)
                .limit(limit);

            const total = await Institution.countDocuments(query);

            return {
                success: true,
                institutions: institutions.map(inst => this.formatInstitutionForResponse(inst)),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            console.error('Error in getInstitutions:', error);
            throw new Error(`Failed to retrieve institutions: ${error.message}`);
        }
    }

    /**
     * Update institution
     * @param {string} institutionId - Institution ID
     * @param {Object} updateData - Update data
     * @param {Object} user - User updating the institution
     * @returns {Promise<Object>} Update result
     */
    async updateInstitution(institutionId, updateData, user) {
        try {
            const institution = await Institution.findById(institutionId);

            if (!institution) {
                throw new Error('Institution not found');
            }

            // Check permissions
            if (!this.canModifyInstitution(institution, user)) {
                throw new Error('Access denied');
            }

            // Update institution
            Object.assign(institution, updateData);
            institution.updatedAt = new Date();
            institution.updatedBy = user._id;

            await institution.save();

            return {
                success: true,
                institution: this.formatInstitutionForResponse(institution),
                message: 'Institution updated successfully'
            };

        } catch (error) {
            console.error('Error in updateInstitution:', error);
            throw new Error(`Failed to update institution: ${error.message}`);
        }
    }

    /**
     * Delete institution
     * @param {string} institutionId - Institution ID
     * @param {Object} user - User deleting the institution
     * @returns {Promise<Object>} Delete result
     */
    async deleteInstitution(institutionId, user) {
        try {
            const institution = await Institution.findById(institutionId);

            if (!institution) {
                throw new Error('Institution not found');
            }

            // Check permissions
            if (!this.canModifyInstitution(institution, user)) {
                throw new Error('Access denied');
            }

            // Check if institution has certificates
            const certificateCount = await Certificate.countDocuments({ 
                institutionId: institutionId 
            });

            if (certificateCount > 0) {
                throw new Error('Cannot delete institution with existing certificates');
            }

            await Institution.findByIdAndDelete(institutionId);

            return {
                success: true,
                message: 'Institution deleted successfully'
            };

        } catch (error) {
            console.error('Error in deleteInstitution:', error);
            throw new Error(`Failed to delete institution: ${error.message}`);
        }
    }

    /**
     * Verify institution
     * @param {string} institutionId - Institution ID
     * @param {Object} user - User verifying the institution
     * @param {string} reason - Verification reason
     * @returns {Promise<Object>} Verification result
     */
    async verifyInstitution(institutionId, user, reason = '') {
        try {
            const institution = await Institution.findById(institutionId);

            if (!institution) {
                throw new Error('Institution not found');
            }

            // Check permissions
            if (user.role !== 'admin') {
                throw new Error('Only admins can verify institutions');
            }

            institution.isVerified = true;
            institution.verifiedAt = new Date();
            institution.verifiedBy = user._id;
            institution.verificationReason = reason;

            await institution.save();

            return {
                success: true,
                institution: this.formatInstitutionForResponse(institution),
                message: 'Institution verified successfully'
            };

        } catch (error) {
            console.error('Error in verifyInstitution:', error);
            throw new Error(`Failed to verify institution: ${error.message}`);
        }
    }

    /**
     * Get institution statistics
     * @param {string} institutionId - Institution ID
     * @param {Object} user - User requesting statistics
     * @returns {Promise<Object>} Institution statistics
     */
    async getInstitutionStats(institutionId, user) {
        try {
            const institution = await Institution.findById(institutionId);

            if (!institution) {
                throw new Error('Institution not found');
            }

            // Check permissions
            if (!this.canAccessInstitution(institution, user)) {
                throw new Error('Access denied');
            }

            // Get certificate statistics
            const certificateStats = await Certificate.aggregate([
                { $match: { institutionId: institution._id } },
                {
                    $group: {
                        _id: '$verificationStatus',
                        count: { $sum: 1 }
                    }
                }
            ]);

            // Get monthly certificate uploads
            const monthlyStats = await Certificate.aggregate([
                { $match: { institutionId: institution._id } },
                {
                    $group: {
                        _id: {
                            year: { $year: '$uploadedAt' },
                            month: { $month: '$uploadedAt' }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } },
                { $limit: 12 }
            ]);

            // Calculate verification rates
            const totalCertificates = await Certificate.countDocuments({ 
                institutionId: institution._id 
            });

            const verifiedCount = await Certificate.countDocuments({ 
                institutionId: institution._id,
                verificationStatus: 'verified'
            });

            const verificationRate = totalCertificates > 0 ? 
                (verifiedCount / totalCertificates) * 100 : 0;

            return {
                success: true,
                statistics: {
                    totalCertificates,
                    verificationRate: Math.round(verificationRate * 100) / 100,
                    statusBreakdown: certificateStats.reduce((acc, stat) => {
                        acc[stat._id] = stat.count;
                        return acc;
                    }, {}),
                    monthlyUploads: monthlyStats,
                    institution: this.formatInstitutionForResponse(institution)
                }
            };

        } catch (error) {
            console.error('Error in getInstitutionStats:', error);
            throw new Error(`Failed to get institution statistics: ${error.message}`);
        }
    }

    /**
     * Search institutions
     * @param {string} query - Search query
     * @param {Object} user - User performing search
     * @param {Object} pagination - Pagination options
     * @returns {Promise<Object>} Search results
     */
    async searchInstitutions(query, user, pagination = {}) {
        try {
            const { page = 1, limit = 10 } = pagination;
            const skip = (page - 1) * limit;

            const searchQuery = {
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { code: { $regex: query, $options: 'i' } },
                    { 'address.city': { $regex: query, $options: 'i' } },
                    { 'address.state': { $regex: query, $options: 'i' } }
                ]
            };

            const institutions = await Institution.find(searchQuery)
                .populate('createdBy', 'email role')
                .sort({ name: 1 })
                .skip(skip)
                .limit(limit);

            const total = await Institution.countDocuments(searchQuery);

            return {
                success: true,
                institutions: institutions.map(inst => this.formatInstitutionForResponse(inst)),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                },
                query
            };

        } catch (error) {
            console.error('Error in searchInstitutions:', error);
            throw new Error(`Failed to search institutions: ${error.message}`);
        }
    }

    /**
     * Check if user can access institution
     * @param {Object} institution - Institution object
     * @param {Object} user - User object
     * @returns {boolean} Can access
     */
    canAccessInstitution(institution, user) {
        // Admin can access all institutions
        if (user.role === 'admin') {
            return true;
        }

        // Institution users can access their own institution
        if (user.role === 'institution' && user.institutionId && 
            user.institutionId.toString() === institution._id.toString()) {
            return true;
        }

        // Verifiers can access all institutions
        if (user.role === 'verifier') {
            return true;
        }

        return false;
    }

    /**
     * Check if user can modify institution
     * @param {Object} institution - Institution object
     * @param {Object} user - User object
     * @returns {boolean} Can modify
     */
    canModifyInstitution(institution, user) {
        // Only admins can modify institutions
        return user.role === 'admin';
    }

    /**
     * Build query for institution filtering
     * @param {Object} filters - Filter criteria
     * @param {Object} user - User making the request
     * @returns {Object} MongoDB query
     */
    buildInstitutionQuery(filters, user) {
        const query = {};

        // Apply role-based filtering
        if (user.role === 'institution' && user.institutionId) {
            query._id = user.institutionId;
        }

        // Apply filters
        if (filters.isVerified !== undefined) {
            query.isVerified = filters.isVerified;
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

        return query;
    }

    /**
     * Format institution for API response
     * @param {Object} institution - Institution object
     * @returns {Object} Formatted institution
     */
    formatInstitutionForResponse(institution) {
        return {
            id: institution._id,
            name: institution.name,
            code: institution.code,
            address: institution.address,
            contactInfo: institution.contactInfo,
            isVerified: institution.isVerified,
            establishedYear: institution.establishedYear,
            accreditation: institution.accreditation,
            apiEndpoint: institution.apiEndpoint,
            certificateTemplates: institution.certificateTemplates,
            totalCertificates: institution.totalCertificates,
            createdBy: institution.createdBy ? {
                id: institution.createdBy._id,
                email: institution.createdBy.email,
                role: institution.createdBy.role
            } : null,
            createdAt: institution.createdAt,
            updatedAt: institution.updatedAt,
            verifiedAt: institution.verifiedAt,
            verifiedBy: institution.verifiedBy,
            verificationReason: institution.verificationReason
        };
    }
}

module.exports = InstitutionService;


