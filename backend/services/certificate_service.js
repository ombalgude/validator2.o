/**
 * Certificate Service
 * Handles business logic for certificate operations
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const Certificate = require('../models/Certificate');
const VerificationLog = require('../models/VerificationLog');
const AIService = require('./ai_service');
const NotificationService = require('./notification_service');
const { normalizeCertificateInput } = require('../utils/certificatePayload');

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
      const normalizedMetadata = normalizeCertificateInput(metadata);
      normalizedMetadata.institutionId = normalizedMetadata.institutionId || user.institutionId || null;

      const certificateId = normalizedMetadata.certificateId || this.generateCertificateId();
      const fileBuffer = await this.getFileBuffer(file);
      const documentHash = this.calculateDocumentHash(fileBuffer);

      const certificate = new Certificate({
        ...normalizedMetadata,
        certificateId,
        documentHash,
        verificationStatus: 'pending',
        uploadedBy: user._id,
        uploadedAt: new Date(),
        filePath: file.path || '',
        originalFileName: file.originalname || '',
        sourceType: metadata.sourceType || 'manual_upload',
      });

      await certificate.save();

      const verificationResults = await this.performAIVerification(file, certificateId);
      certificate.verificationResults = verificationResults;
      certificate.verificationStatus = this.determineVerificationStatus(verificationResults);
      await certificate.save();

      await this.logVerification(certificate, user, certificate.verificationStatus, {
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        verificationMethod: 'ai_analysis',
      });

      await this.notificationService.sendVerificationComplete(certificateId, certificate.verificationStatus);

      return {
        success: true,
        certificateId,
        certificateHash: certificate.certificateHash,
        verificationStatus: certificate.verificationStatus,
        verificationResults,
        message: 'Certificate uploaded and verified successfully',
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

      if (!this.canAccessCertificate(certificate, user)) {
        throw new Error('Access denied');
      }

      return {
        success: true,
        certificate: this.formatCertificateForResponse(certificate),
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
        certificates: certificates.map((certificate) => this.formatCertificateForResponse(certificate)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
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

      if (!['verified', 'suspicious', 'fake', 'pending'].includes(status)) {
        throw new Error('Invalid verification status');
      }

      certificate.verificationStatus = status;
      await certificate.save();

      await this.logVerification(certificate, user, status, {
        verificationMethod: 'manual_review',
        reason,
        details: `Status changed to ${status} by ${user.email}`,
      });

      await this.notificationService.sendStatusUpdate(certificateId, status);

      return {
        success: true,
        message: 'Verification status updated successfully',
        certificateId,
        newStatus: status,
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
      const records = Array.isArray(metadata.records) ? metadata.records : [];

      for (let index = 0; index < files.length; index += 1) {
        try {
          const result = await this.uploadAndVerify(files[index], user, {
            ...(records[index] || {}),
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
            sourceType: 'bulk_upload',
          });
          results.push(result);
        } catch (error) {
          errors.push({
            fileName: files[index].originalname,
            error: error.message,
          });
        }
      }

      return {
        success: true,
        processed: results.length,
        errors: errors.length,
        results,
        errors,
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
        errors: [],
      };

      const startTime = Date.now();

      try {
        const ocrResult = await this.aiService.extractText(file);
        results.ocrConfidence = ocrResult.confidence || 0;
        results.extractedText = ocrResult.text || '';

        const tamperResult = await this.aiService.detectTampering(file);
        results.tamperScore = tamperResult.tampering_score || 0;
        results.tamperingDetected = tamperResult.tampering_detected || false;

        const templateResult = await this.aiService.matchTemplate(file);
        results.templateMatch = templateResult.match_score || 0;
        results.templateId = templateResult.template_id || null;

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
        tamperScore: 100,
        databaseMatch: false,
        anomalyScore: 100,
        processingTime: 0,
        errors: [error.message],
      };
    }
  }

  /**
   * Generate unique certificate ID
   * @returns {string} Unique certificate ID
   */
  generateCertificateId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 7);
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
    const {
      ocrConfidence = 0,
      tamperScore = 0,
      anomalyScore = 0,
      databaseMatch = false,
    } = results;

    if (tamperScore >= 70 || anomalyScore >= 70) {
      return 'fake';
    }

    if (tamperScore >= 40 || anomalyScore >= 40 || ocrConfidence <= 50) {
      return 'suspicious';
    }

    if (databaseMatch || (tamperScore <= 20 && anomalyScore <= 20 && ocrConfidence >= 70)) {
      return 'verified';
    }

    return 'pending';
  }

  /**
   * Check if user can access certificate
   * @param {Object} certificate - Certificate object
   * @param {Object} user - User object
   * @returns {boolean} Can access
   */
  canAccessCertificate(certificate, user) {
    if (user.role === 'admin' || user.role === 'verifier' || user.role === 'company_admin') {
      return true;
    }

    if (
      (user.role === 'institution_admin' || user.role === 'university_admin') &&
      user.institutionId &&
      certificate.institutionId &&
      user.institutionId.toString() === certificate.institutionId._id.toString()
    ) {
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

    if ((user.role === 'institution_admin' || user.role === 'university_admin') && user.institutionId) {
      query.institutionId = user.institutionId;
    }

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

    if (filters.certificateHash) {
      query.certificateHash = String(filters.certificateHash).trim().toLowerCase();
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
      certificateHash: certificate.certificateHash,
      student: certificate.student,
      college: certificate.college,
      exam: certificate.exam,
      subjects: certificate.subjects,
      summary: certificate.summary,
      issue: certificate.issue,
      studentName: certificate.studentName,
      rollNumber: certificate.rollNumber,
      course: certificate.course,
      issueDate: certificate.issueDate,
      institution: certificate.institutionId
        ? {
            id: certificate.institutionId._id,
            name: certificate.institutionId.name,
            code: certificate.institutionId.code,
          }
        : null,
      verificationStatus: certificate.verificationStatus,
      verificationResults: certificate.verificationResults,
      uploadedBy: certificate.uploadedBy
        ? {
            id: certificate.uploadedBy._id,
            email: certificate.uploadedBy.email,
            role: certificate.uploadedBy.role,
          }
        : null,
      uploadedAt: certificate.uploadedAt,
      originalFileName: certificate.originalFileName,
    };
  }

  /**
   * Log verification activity
   * @param {Object} certificate - Certificate document
   * @param {Object} user - Acting user
   * @param {string} result - Verification result
   * @param {Object} details - Additional details
   * @returns {Promise<void>}
   */
  async logVerification(certificate, user, result, details = {}) {
    try {
      const log = new VerificationLog({
        certificateId: certificate._id,
        verifiedBy: user._id,
        institutionId: certificate.institutionId,
        timestamp: new Date(),
        result,
        ipAddress: details.ipAddress || '',
        userAgent: details.userAgent || '',
        verificationMethod: details.verificationMethod || 'system',
        certificateHash: certificate.certificateHash,
        verifierRole: user.role || '',
        details,
      });

      await log.save();
    } catch (error) {
      console.error('Error logging verification:', error);
    }
  }

  async getFileBuffer(file) {
    if (file?.buffer) {
      return file.buffer;
    }

    if (file?.path) {
      return fs.readFile(file.path);
    }

    throw new Error('Uploaded file is missing a readable buffer or path');
  }
}

module.exports = CertificateService;
