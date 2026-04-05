/**
 * Certificate Service
 * Handles business logic for certificate operations
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const Certificate = require('../models/Certificate');
const Institution = require('../models/Institution');
const VerificationLog = require('../models/VerificationLog');
const AIService = require('./ai_service');
const notificationService = require('./notification_instance');
const { normalizeCertificateInput } = require('../utils/certificatePayload');
const { buildInstitutionScopedFilter, canUserAccessInstitution } = require('../utils/institutionScope');

const ALLOWED_UPLOAD_ROLES = new Set(['admin', 'institution_admin', 'university_admin']);
const ALLOWED_VERIFY_ROLES = new Set(['admin', 'verifier', 'company_admin']);
const VALID_STATUSES = new Set(['verified', 'suspicious', 'fake', 'pending']);

const normalizeCertificateId = (certificateId) => String(certificateId || '').trim().toUpperCase();
const getIdValue = (value) => value?._id || value || null;

class CertificateService {
  constructor({ aiService, notificationService: injectedNotificationService } = {}) {
    this.aiService = aiService || new AIService();
    this.notificationService = injectedNotificationService || notificationService;
  }

  async uploadAndVerify(file, user, metadata = {}) {
    try {
      const normalizedMetadata = normalizeCertificateInput(metadata);
      normalizedMetadata.institutionId = normalizedMetadata.institutionId || String(user.institutionId || '').trim() || null;

      if (!ALLOWED_UPLOAD_ROLES.has(user.role)) {
        throw new Error('Access denied');
      }

      if (!normalizedMetadata.institutionId) {
        throw new Error('Institution ID is required');
      }

      if (!this.canUploadToInstitution(user, normalizedMetadata.institutionId)) {
        throw new Error('Access denied');
      }

      const institution = await Institution.findById(normalizedMetadata.institutionId).select('_id');
      if (!institution) {
        throw new Error('Institution not found');
      }

      const certificateId = normalizeCertificateId(normalizedMetadata.certificateId) || this.generateCertificateId();
      const fileBuffer = await this.getFileBuffer(file);
      const uploadedBy = getIdValue(user._id || user.id);
      const aiCompatibleFile = file?.buffer ? file : { ...file, buffer: fileBuffer };

      const certificate = new Certificate({
        ...normalizedMetadata,
        certificateId,
        documentHash: this.calculateDocumentHash(fileBuffer),
        verificationStatus: 'pending',
        uploadedBy,
        uploadedAt: new Date(),
        filePath: file.path || '',
        originalFileName: file.originalname || '',
        sourceType: metadata.sourceType || 'manual_upload',
      });

      await certificate.save();
      await Institution.findByIdAndUpdate(certificate.institutionId, { $inc: { totalCertificates: 1 } });

      const verificationResults = await this.performAIVerification(aiCompatibleFile);
      certificate.verificationResults = verificationResults;
      certificate.verificationStatus = this.determineVerificationStatus(verificationResults);
      await certificate.save();

      await this.logVerification(certificate, user, certificate.verificationStatus, {
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        verificationMethod: 'ai_analysis',
      });

      await this.notificationService.sendVerificationComplete(certificate.certificateId, certificate.verificationStatus, {
        uploadedBy,
        institutionId: getIdValue(certificate.institutionId),
      });

      return {
        success: true,
        certificateId: certificate.certificateId,
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

  async getCertificate(certificateId, user) {
    try {
      const normalizedCertificateId = normalizeCertificateId(certificateId);
      const certificate = await Certificate.findOne({ certificateId: normalizedCertificateId })
        .populate('institutionId', 'name code')
        .populate('uploadedBy', 'email role');

      if (!certificate) {
        throw new Error('Certificate not found');
      }

      if (!(await this.canAccessCertificate(certificate, user))) {
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

  async getCertificates(filters = {}, user, pagination = {}) {
    try {
      const { page = 1, limit = 10, sortBy = 'uploadedAt', sortOrder = 'desc' } = pagination;
      const skip = (page - 1) * limit;
      const query = await this.buildCertificateQuery(filters, user);

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

  async updateVerificationStatus(certificateId, status, user, reason = '') {
    try {
      const normalizedStatus = String(status || '').trim();

      if (!ALLOWED_VERIFY_ROLES.has(user.role)) {
        throw new Error('Access denied');
      }

      if (!VALID_STATUSES.has(normalizedStatus)) {
        throw new Error('Invalid verification status');
      }

      const certificate = await Certificate.findOne({ certificateId: normalizeCertificateId(certificateId) });

      if (!certificate) {
        throw new Error('Certificate not found');
      }

      if (!(await this.canAccessCertificate(certificate, user))) {
        throw new Error('Access denied');
      }

      certificate.verificationStatus = normalizedStatus;
      await certificate.save();

      await this.logVerification(certificate, user, normalizedStatus, {
        verificationMethod: 'manual_review',
        reason,
        details: `Status changed to ${normalizedStatus} by ${user.email || 'system'}`,
      });

      await this.notificationService.sendStatusUpdate(certificate.certificateId, normalizedStatus, {
        uploadedBy: getIdValue(certificate.uploadedBy),
        institutionId: getIdValue(certificate.institutionId),
      });

      return {
        success: true,
        message: 'Verification status updated successfully',
        certificateId: certificate.certificateId,
        newStatus: normalizedStatus,
      };
    } catch (error) {
      console.error('Error in updateVerificationStatus:', error);
      throw new Error(`Failed to update verification status: ${error.message}`);
    }
  }

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

  async performAIVerification(file) {
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
        results.templateId = templateResult.template_id || '';

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

  generateCertificateId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 7);
    return `CERT_${timestamp}_${random}`.toUpperCase();
  }

  calculateDocumentHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

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

  canUploadToInstitution(user, institutionId) {
    if (user.role === 'admin') {
      return true;
    }

    if (user.role === 'institution_admin' || user.role === 'university_admin') {
      return String(user.institutionId || '') === String(institutionId || '');
    }

    return false;
  }

  async canAccessCertificate(certificate, user) {
    return canUserAccessInstitution(user, getIdValue(certificate.institutionId));
  }

  async buildCertificateQuery(filters, user) {
    const query = {};

    if (filters.status || filters.verificationStatus) {
      query.verificationStatus = filters.status || filters.verificationStatus;
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

    if (filters.certificateId) {
      query.certificateId = normalizeCertificateId(filters.certificateId);
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

    return buildInstitutionScopedFilter(query, user);
  }

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
            id: getIdValue(certificate.institutionId),
            name: certificate.institutionId.name || '',
            code: certificate.institutionId.code || '',
          }
        : null,
      verificationStatus: certificate.verificationStatus,
      verificationResults: certificate.verificationResults,
      uploadedBy: certificate.uploadedBy
        ? {
            id: getIdValue(certificate.uploadedBy),
            email: certificate.uploadedBy.email || '',
            role: certificate.uploadedBy.role || '',
          }
        : null,
      uploadedAt: certificate.uploadedAt,
      originalFileName: certificate.originalFileName,
    };
  }

  async logVerification(certificate, user, result, details = {}) {
    try {
      const log = new VerificationLog({
        certificateId: getIdValue(certificate._id),
        verifiedBy: getIdValue(user._id || user.id),
        institutionId: getIdValue(certificate.institutionId),
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
