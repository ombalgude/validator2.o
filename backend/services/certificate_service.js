/**
 * Certificate Service
 * Handles business logic for certificate operations
 */

const Certificate = require('../models/Certificate');
const Institution = require('../models/Institution');
const VerificationLog = require('../models/VerificationLog');
const AIService = require('./ai_service');
const NotificationService = require('./notification_service');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class CertificateService {
    constructor() {
        this.aiService = new AIService();
        this.notificationService = new NotificationService();
    }

    /**
     * Upload and verify a certificate
     * @param {Object} file - Uploaded file
     * @param {Object} user - User performing the upload
     * @param {Object} metadata - Additional metadata
     * @returns {Promise<Object>} Verification result
     */
    async uploadAndVerify(file, user, metadata = {}) {
        try {
            // Generate unique certificate ID
            const certificateId = this.generateCertificateId();
            
            // Calculate document hash
            const documentHash = this.calculateDocumentHash(file.buffer);
            
            // Create certificate record
            const certificate = new Certificate({
                certificateId,
                studentName: metadata.studentName || '',
                rollNumber: metadata.rollNumber || '',
                institutionId: metadata.institutionId || null,
                course: metadata.course || '',
                degree: metadata.degree || '',
                issueDate: metadata.issueDate || new Date(),
                grades: metadata.grades || {},
                documentHash,
                verificationStatus: 'pending',
                uploadedBy: user._id,
                uploadedAt: new Date(),
                filePath: file.path,
                originalFileName: file.originalname
            });

            await certificate.save();

            // Start AI verification process
            const verificationResults = await this.performAIVerification(file, certificateId);
            
            // Update certificate with verification results
            certificate.verificationResults = verificationResults;
            certificate.verificationStatus = this.determineVerificationStatus(verificationResults);
            await certificate.save();

            // Log verification
            await this.logVerification(certificateId, user._id, certificate.verificationStatus, {
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent,
                verificationMethod: 'ai_analysis'
            });

            // Send notifications
            await this.notificationService.sendVerificationComplete(certificateId, certificate.verificationStatus);

            return {
                success: true,
                certificateId,
                verificationStatus: certificate.verificationStatus,
                verificationResults,
                message: 'Certificate uploaded and verified successfully'
            };

        } catch (error) {
            console.error('Error in uploadAndVerify:', error);
            throw new Error(`Certificate upload failed: ${error.message}`);
        }
    }

    /**
     * Get certificate by ID
     * @param {string} certificateId - Certificate ID
     * @param {Object} user - User requesting the certificate
     * @returns {Promise<Object>} Certificate data
     */
    async getCertificate(certificateId, user) {
        try {
            const certificate = await Certificate.findOne({ certificateId })
                .populate('institutionId', 'name code')
                .populate('uploadedBy', 'email role');

            if (!certificate) {
                throw new Error('Certificate not found');
            }

            // Check permissions
            if (!this.canAccessCertificate(certificate, user)) {
                throw new Error('Access denied');
            }

            return {
                success: true,
                certificate: this.formatCertificateForResponse(certificate)
            };

        } catch (error) {
            console.error('Error in getCertificate:', error);
            throw new Error(`Failed to retrieve certificate: ${error.message}`);
        }
    }

    /**
     * Get all certificates with filtering and pagination
     * @param {Object} filters - Filter criteria
     * @param {Object} user - User requesting certificates
     * @param {Object} pagination - Pagination options
     * @returns {Promise<Object>} Paginated certificate list
     */
    async getCertificates(filters = {}, user, pagination = {}) {
        try {
            const { page = 1, limit = 10, sortBy = 'uploadedAt', sortOrder = 'desc' } = pagination;
            const skip = (page - 1) * limit;

            // Build query based on user role and filters
            const query = this.buildCertificateQuery(filters, user);

            const certificates = await Certificate.find(query)
                .populate('institutionId', 'name code')
                .populate('uploadedBy', 'email role')
                .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
                .skip(skip)
                .limit(limit);

            const total = await Certificate.countDocuments(query);

            return {
                success: true,
                certificates: certificates.map(cert => this.formatCertificateForResponse(cert)),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            console.error('Error in getCertificates:', error);
            throw new Error(`Failed to retrieve certificates: ${error.message}`);
        }
    }

    /**
     * Update certificate verification status
     * @param {string} certificateId - Certificate ID
     * @param {string} status - New verification status
     * @param {Object} user - User updating the status
     * @param {string} reason - Reason for status change
     * @returns {Promise<Object>} Update result
     */
    async updateVerificationStatus(certificateId, status, user, reason = '') {
        try {
            const certificate = await Certificate.findOne({ certificateId });

            if (!certificate) {
                throw new Error('Certificate not found');
            }

            // Validate status
            const validStatuses = ['verified', 'suspicious', 'fake', 'pending'];
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid verification status');
            }

            // Update certificate
            certificate.verificationStatus = status;
            await certificate.save();

            // Log the change
            await this.logVerification(certificateId, user._id, status, {
                verificationMethod: 'manual_review',
                reason,
                details: `Status changed to ${status} by ${user.email}`
            });

            // Send notification
            await this.notificationService.sendStatusUpdate(certificateId, status);

            return {
                success: true,
                message: 'Verification status updated successfully',
                certificateId,
                newStatus: status
            };

        } catch (error) {
            console.error('Error in updateVerificationStatus:', error);
            throw new Error(`Failed to update verification status: ${error.message}`);
        }
    }

    /**
     * Perform bulk certificate upload
     * @param {Array} files - Array of uploaded files
     * @param {Object} user - User performing the upload
     * @param {Object} metadata - Additional metadata
     * @returns {Promise<Object>} Bulk upload result
     */
    async bulkUpload(files, user, metadata = {}) {
        try {
            const results = [];
            const errors = [];

            for (let i = 0; i < files.length; i++) {
                try {
                    const file = files[i];
                    const result = await this.uploadAndVerify(file, user, {
                        ...metadata,
                        ipAddress: metadata.ipAddress,
                        userAgent: metadata.userAgent
                    });
                    results.push(result);
                } catch (error) {
                    errors.push({
                        fileName: files[i].originalname,
                        error: error.message
                    });
                }
            }

            return {
                success: true,
                processed: results.length,
                errors: errors.length,
                results,
                errors
            };

        } catch (error) {
            console.error('Error in bulkUpload:', error);
            throw new Error(`Bulk upload failed: ${error.message}`);
        }
    }

    /**
     * Perform AI verification on certificate
     * @param {Object} file - Uploaded file
     * @param {string} certificateId - Certificate ID
     * @returns {Promise<Object>} AI verification results
     */
    async performAIVerification(file, certificateId) {
        try {
            const results = {
                ocrConfidence: 0,
                tamperScore: 0,
                databaseMatch: false,
                anomalyScore: 0,
                processingTime: 0,
                errors: []
            };

            const startTime = Date.now();

            try {
                // OCR text extraction
                const ocrResult = await this.aiService.extractText(file);
                results.ocrConfidence = ocrResult.confidence || 0;
                results.extractedText = ocrResult.text || '';

                // Tampering detection
                const tamperResult = await this.aiService.detectTampering(file);
                results.tamperScore = tamperResult.tampering_score || 0;
                results.tamperingDetected = tamperResult.tampering_detected || false;

                // Template matching
                const templateResult = await this.aiService.matchTemplate(file);
                results.templateMatch = templateResult.match_score || 0;
                results.templateId = templateResult.template_id || null;

                // Anomaly detection
                const anomalyResult = await this.aiService.detectAnomalies(file);
                results.anomalyScore = anomalyResult.anomaly_score || 0;
                results.anomalies = anomalyResult.anomalies || [];

            } catch (aiError) {
                console.error('AI verification error:', aiError);
                results.errors.push(aiError.message);
            }

            results.processingTime = Date.now() - startTime;

            return results;

        } catch (error) {
            console.error('Error in performAIVerification:', error);
            return {
                ocrConfidence: 0,
                tamperScore: 1,
                databaseMatch: false,
                anomalyScore: 1,
                processingTime: 0,
                errors: [error.message]
            };
        }
    }

    /**
     * Generate unique certificate ID
     * @returns {string} Unique certificate ID
     */
    generateCertificateId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `CERT_${timestamp}_${random}`.toUpperCase();
    }

    /**
     * Calculate document hash
     * @param {Buffer} buffer - File buffer
     * @returns {string} SHA-256 hash
     */
    calculateDocumentHash(buffer) {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    /**
     * Determine verification status based on AI results
     * @param {Object} results - AI verification results
     * @returns {string} Verification status
     */
    determineVerificationStatus(results) {
        const { ocrConfidence, tamperScore, anomalyScore } = results;

        // High tampering or anomaly scores indicate fake
        if (tamperScore > 0.7 || anomalyScore > 0.7) {
            return 'fake';
        }

        // Medium scores indicate suspicious
        if (tamperScore > 0.4 || anomalyScore > 0.4 || ocrConfidence < 0.5) {
            return 'suspicious';
        }

        // Low scores and good OCR confidence indicate verified
        if (tamperScore < 0.2 && anomalyScore < 0.2 && ocrConfidence > 0.7) {
            return 'verified';
        }

        // Default to pending for manual review
        return 'pending';
    }

    /**
     * Check if user can access certificate
     * @param {Object} certificate - Certificate object
     * @param {Object} user - User object
     * @returns {boolean} Can access
     */
    canAccessCertificate(certificate, user) {
        // Admin can access all certificates
        if (user.role === 'admin') {
            return true;
        }

        // Institution users can access their institution's certificates
        if (user.role === 'institution' && user.institutionId && 
            certificate.institutionId && 
            user.institutionId.toString() === certificate.institutionId._id.toString()) {
            return true;
        }

        // Verifiers can access all certificates
        if (user.role === 'verifier') {
            return true;
        }

        return false;
    }

    /**
     * Build query for certificate filtering
     * @param {Object} filters - Filter criteria
     * @param {Object} user - User making the request
     * @returns {Object} MongoDB query
     */
    buildCertificateQuery(filters, user) {
        const query = {};

        // Apply role-based filtering
        if (user.role === 'institution' && user.institutionId) {
            query.institutionId = user.institutionId;
        }

        // Apply filters
        if (filters.verificationStatus) {
            query.verificationStatus = filters.verificationStatus;
        }

        if (filters.institutionId) {
            query.institutionId = filters.institutionId;
        }

        if (filters.studentName) {
            query.studentName = { $regex: filters.studentName, $options: 'i' };
        }

        if (filters.rollNumber) {
            query.rollNumber = { $regex: filters.rollNumber, $options: 'i' };
        }

        if (filters.dateFrom || filters.dateTo) {
            query.uploadedAt = {};
            if (filters.dateFrom) {
                query.uploadedAt.$gte = new Date(filters.dateFrom);
            }
            if (filters.dateTo) {
                query.uploadedAt.$lte = new Date(filters.dateTo);
            }
        }

        return query;
    }

    /**
     * Format certificate for API response
     * @param {Object} certificate - Certificate object
     * @returns {Object} Formatted certificate
     */
    formatCertificateForResponse(certificate) {
        return {
            id: certificate._id,
            certificateId: certificate.certificateId,
            studentName: certificate.studentName,
            rollNumber: certificate.rollNumber,
            institution: certificate.institutionId ? {
                id: certificate.institutionId._id,
                name: certificate.institutionId.name,
                code: certificate.institutionId.code
            } : null,
            course: certificate.course,
            degree: certificate.degree,
            issueDate: certificate.issueDate,
            grades: certificate.grades,
            verificationStatus: certificate.verificationStatus,
            verificationResults: certificate.verificationResults,
            uploadedBy: certificate.uploadedBy ? {
                id: certificate.uploadedBy._id,
                email: certificate.uploadedBy.email,
                role: certificate.uploadedBy.role
            } : null,
            uploadedAt: certificate.uploadedAt,
            originalFileName: certificate.originalFileName
        };
    }

    /**
     * Log verification activity
     * @param {string} certificateId - Certificate ID
     * @param {string} verifiedBy - User ID
     * @param {string} result - Verification result
     * @param {Object} details - Additional details
     * @returns {Promise<void>}
     */
    async logVerification(certificateId, verifiedBy, result, details = {}) {
        try {
            const log = new VerificationLog({
                certificateId,
                verifiedBy,
                timestamp: new Date(),
                result,
                ipAddress: details.ipAddress || '',
                userAgent: details.userAgent || '',
                verificationMethod: details.verificationMethod || 'unknown',
                details: details.details || ''
            });

            await log.save();
        } catch (error) {
            console.error('Error logging verification:', error);
        }
    }
}

module.exports = CertificateService;


