/**
 * Certificate Service
 * Keeps certificate business rules in one place so routes stay thin.
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const Certificate = require('../models/Certificate');
const Institution = require('../models/Institution');
const VerificationLog = require('../models/VerificationLog');
const AIService = require('./ai_service');
const notificationService = require('./notification_instance');
const {
  computeCertificateHash,
  deriveCertificateSearchFields,
  normalizeCertificateInput,
} = require('../utils/certificatePayload');
const { buildInstitutionScopedFilter, canUserAccessInstitution } = require('../utils/institutionScope');

const ALLOWED_UPLOAD_ROLES = new Set(['admin', 'institution_admin', 'university_admin']);
const ALLOWED_VERIFY_ROLES = new Set(['admin', 'company_admin']);
const ALLOWED_COMPARE_ROLES = new Set(['admin', 'institution_admin', 'university_admin', 'company_admin']);
const VALID_STATUSES = new Set(['verified', 'suspicious', 'fake', 'pending']);

const VERIFY_METHODS = {
  AI_ANALYSIS: 'ai_analysis',
  DATABASE_CHECK: 'database_check',
  MANUAL_REVIEW: 'manual_review',
  SYSTEM: 'system',
};

const normalizeCertificateId = (certificateId) => String(certificateId || '').trim().toUpperCase();
const getIdValue = (value) => value?._id || value || null;

const createServiceError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const buildCertificateSummary = (certificate) => ({
  id: certificate._id,
  certificateId: certificate.certificateId,
  certificateHash: certificate.certificateHash,
  status: certificate.verificationStatus,
});

const buildPaginationResult = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

class CertificateService {
  constructor({ aiService, notificationService: injectedNotificationService } = {}) {
    this.aiService = aiService || new AIService();
    this.notificationService = injectedNotificationService || notificationService;
  }

  async createTrustedCertificate(file, user, input, options = {}) {
    const { certificate, fileBuffer } = await this.storeTrustedCertificateRecord({
      file,
      user,
      input,
      sourceType: options.sourceType || 'manual_upload',
    });

    let verificationResults = null;
    if (options.verifyWithAI !== false) {
      verificationResults = await this.applyAiVerification(certificate, file, fileBuffer);
    }

    return {
      message: 'Certificate uploaded successfully',
      certificate: buildCertificateSummary(certificate),
      verificationStatus: certificate.verificationStatus,
      verificationResults,
    };
  }

  async createBulkTrustedCertificates(files, records, user) {
    if (!Array.isArray(files) || files.length === 0) {
      throw createServiceError('No files uploaded');
    }

    if (!Array.isArray(records) || records.length !== files.length) {
      throw createServiceError('Bulk upload requires a records JSON array with one certificate payload per file');
    }

    const certificates = [];
    const errors = [];

    for (let index = 0; index < files.length; index += 1) {
      try {
        const result = await this.createTrustedCertificate(files[index], user, records[index], {
          sourceType: 'bulk_upload',
        });

        certificates.push(result.certificate);
      } catch (error) {
        errors.push({
          file: files[index].originalname,
          error: error.message,
        });
      }
    }

    return {
      message: 'Bulk upload completed',
      uploaded: certificates.length,
      failed: errors.length,
      certificates,
      errors,
    };
  }

  async uploadAndVerify(file, user, input = {}, requestDetails = {}) {
    try {
      const { certificate, fileBuffer } = await this.storeTrustedCertificateRecord({
        file,
        user,
        input,
        sourceType: requestDetails.sourceType || 'manual_upload',
      });

      const verificationResults = await this.applyAiVerification(certificate, file, fileBuffer);

      await this.logVerification(certificate, user, certificate.verificationStatus, {
        ipAddress: requestDetails.ipAddress,
        userAgent: requestDetails.userAgent,
        verificationMethod: VERIFY_METHODS.AI_ANALYSIS,
      });

      await this.notificationService.sendVerificationComplete(certificate.certificateId, certificate.verificationStatus, {
        uploadedBy: getIdValue(certificate.uploadedBy),
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
      throw this.wrapUnexpectedError(error, 'Certificate upload failed');
    }
  }

  async getCertificate(certificateId, user) {
    try {
      const certificate = await Certificate.findOne({ certificateId: normalizeCertificateId(certificateId) })
        .populate('institutionId', 'name code')
        .populate('uploadedBy', 'email role');

      if (!certificate) {
        throw createServiceError('Certificate not found', 404);
      }

      if (!(await this.canAccessCertificate(certificate, user))) {
        throw createServiceError('Access denied', 403);
      }

      return {
        success: true,
        certificate: this.formatCertificateForResponse(certificate),
      };
    } catch (error) {
      console.error('Error in getCertificate:', error);
      throw this.wrapUnexpectedError(error, 'Failed to retrieve certificate');
    }
  }

  async getCertificates(filters = {}, user, pagination = {}) {
    try {
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const sortBy = pagination.sortBy || 'uploadedAt';
      const sortOrder = pagination.sortOrder === 'asc' ? 1 : -1;
      const skip = (page - 1) * limit;
      const query = await this.buildCertificateQuery(filters, user);

      const certificates = await Certificate.find(query)
        .populate('institutionId', 'name code')
        .populate('uploadedBy', 'email role')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit);

      const total = await Certificate.countDocuments(query);

      return {
        success: true,
        certificates: certificates.map((certificate) => this.formatCertificateForResponse(certificate)),
        pagination: buildPaginationResult(page, limit, total),
      };
    } catch (error) {
      console.error('Error in getCertificates:', error);
      throw this.wrapUnexpectedError(error, 'Failed to retrieve certificates');
    }
  }

  async updateVerificationStatus(identifier, update, user, requestDetails = {}) {
    try {
      this.ensureRole(ALLOWED_VERIFY_ROLES, user, 'Access denied', 403);

      const normalizedStatus = String(update.status || '').trim();
      if (!VALID_STATUSES.has(normalizedStatus)) {
        throw createServiceError('Invalid verification status');
      }

      const certificate = await this.findCertificateByIdentifier(identifier);
      if (!certificate) {
        throw createServiceError('Certificate not found', 404);
      }

      if (!(await this.canAccessCertificate(certificate, user))) {
        throw createServiceError('Access denied', 403);
      }

      certificate.verificationStatus = normalizedStatus;
      if (update.verificationResults) {
        certificate.verificationResults = {
          ...certificate.verificationResults,
          ...update.verificationResults,
        };
      }

      await certificate.save();

      await this.logVerification(certificate, user, normalizedStatus, {
        ipAddress: requestDetails.ipAddress,
        userAgent: requestDetails.userAgent,
        verificationMethod: update.verificationMethod || VERIFY_METHODS.MANUAL_REVIEW,
        ...(update.reason ? { reason: String(update.reason).trim() } : {}),
        ...(update.verificationResults || {}),
      });

      await this.notificationService.sendStatusUpdate(certificate.certificateId, normalizedStatus, {
        uploadedBy: getIdValue(certificate.uploadedBy),
        institutionId: getIdValue(certificate.institutionId),
      });

      return {
        message: 'Certificate verification updated',
        certificate: this.formatCertificateForResponse(certificate),
      };
    } catch (error) {
      console.error('Error in updateVerificationStatus:', error);
      throw this.wrapUnexpectedError(error, 'Failed to update verification status');
    }
  }

  async compareCandidateCertificate(input, user, file = null, requestDetails = {}) {
    try {
      this.ensureRole(ALLOWED_COMPARE_ROLES, user, 'Access denied', 403);

      const candidate = await this.buildCandidateSnapshot(input, file);
      const trustedMatch = await this.findTrustedCertificateMatch(candidate);

      if (trustedMatch.certificate && !(await this.canAccessCertificate(trustedMatch.certificate, user))) {
        throw createServiceError('Access denied', 403);
      }

      const comparison = this.evaluateCandidateMatch(candidate, trustedMatch);

      if (trustedMatch.certificate) {
        await this.logVerification(trustedMatch.certificate, user, comparison.verificationStatus, {
          ipAddress: requestDetails.ipAddress,
          userAgent: requestDetails.userAgent,
          verificationMethod: VERIFY_METHODS.DATABASE_CHECK,
          databaseMatch: comparison.isMatch,
          candidateCertificateHash: candidate.certificateHash,
          candidateDocumentHash: candidate.documentHash,
          matchType: comparison.matchType,
        });
      }

      return {
        success: true,
        isMatch: comparison.isMatch,
        verificationStatus: comparison.verificationStatus,
        matchType: comparison.matchType,
        message: comparison.message,
        candidateCertificate: {
          certificateId: candidate.certificateId,
          certificateHash: candidate.certificateHash,
          documentHash: candidate.documentHash,
          studentName: candidate.searchFields.studentName,
          rollNumber: candidate.searchFields.rollNumber,
          course: candidate.searchFields.course,
          issueDate: candidate.searchFields.issueDate,
        },
        trustedCertificate: trustedMatch.certificate
          ? this.formatCertificateForResponse(trustedMatch.certificate)
          : null,
      };
    } catch (error) {
      console.error('Error in compareCandidateCertificate:', error);
      throw this.wrapUnexpectedError(error, 'Candidate certificate comparison failed');
    }
  }

  async performAIVerification(file) {
    try {
      const startTime = Date.now();
      const aiContext = {
        document_type: 'certificate',
      };
      const completeResult = await this.aiService.completeVerification(file, aiContext);

      if (completeResult?.success && completeResult.verification_status !== 'error') {
        return this.normalizeCompleteVerificationResult(completeResult);
      }

      const results = {
        ocrConfidence: 0,
        tamperScore: 0,
        databaseMatch: false,
        anomalyScore: 0,
        processingTime: 0,
        errors: completeResult?.error ? [completeResult.error] : [],
        recommendations: [],
        orchestrator: null,
      };

      try {
        const ocrResult = await this.aiService.extractText(file, aiContext);
        results.ocrConfidence = ocrResult.confidence || 0;
        results.extractedText = ocrResult.text || '';
        results.orchestrator = ocrResult.validation_results
          ? {
              validation_results: ocrResult.validation_results,
              integration_requirements: ocrResult.integration_requirements || [],
              ledger_update: ocrResult.ledger_update || [],
            }
          : null;
        results.recommendations = (ocrResult.integration_requirements || [])
          .map((requirement) => requirement.reason)
          .filter(Boolean);

        const tamperResult = await this.aiService.detectTampering(file);
        results.tamperScore = tamperResult.tampering_score || 0;
        results.tamperingDetected = tamperResult.tampering_detected || false;
        results.recommendations = [
          ...results.recommendations,
          ...(tamperResult.recommendations || []),
        ];

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
      results.recommendations = [...new Set(results.recommendations)];
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
        recommendations: [],
        orchestrator: null,
      };
    }
  }

  normalizeCompleteVerificationResult(completeResult) {
    const orchestration =
      completeResult.orchestration_results ||
      completeResult.ocr_results?.orchestration ||
      null;

    return {
      ocrConfidence: completeResult.ocr_results?.confidence || 0,
      tamperScore: completeResult.tampering_results?.confidence_score || 0,
      databaseMatch: false,
      anomalyScore: completeResult.anomaly_results?.anomaly_score || 0,
      processingTime: completeResult.processing_time || 0,
      errors: completeResult.error ? [completeResult.error] : [],
      tamperingDetected: completeResult.tampering_results?.tampering_detected || false,
      templateMatch: completeResult.template_results?.match_score || 0,
      templateId: completeResult.template_results?.template_id || '',
      anomalies: completeResult.anomaly_results?.anomalies || [],
      extractedText: completeResult.ocr_results?.text || '',
      recommendations: completeResult.recommendations || [],
      orchestrator: orchestration,
    };
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

  async storeTrustedCertificateRecord({ file, user, input, sourceType }) {
    const normalizedInput = this.prepareTrustedCertificateInput(input, user);

    this.ensureRole(ALLOWED_UPLOAD_ROLES, user, 'Access denied', 403);

    if (!normalizedInput.institutionId) {
      throw createServiceError('Institution ID is required');
    }

    if (!this.canUploadToInstitution(user, normalizedInput.institutionId)) {
      throw createServiceError('Access denied', 403);
    }

    await this.ensureInstitutionExists(normalizedInput.institutionId);

    const fileBuffer = await this.getFileBuffer(file);
    const certificate = new Certificate({
      ...normalizedInput,
      certificateId: normalizeCertificateId(normalizedInput.certificateId) || this.generateCertificateId(),
      documentHash: this.calculateDocumentHash(fileBuffer),
      uploadedBy: getIdValue(user._id || user.id),
      uploadedAt: new Date(),
      filePath: file.path || '',
      originalFileName: file.originalname || '',
      sourceType,
      verificationStatus: 'pending',
    });

    await certificate.save();
    await Institution.findByIdAndUpdate(certificate.institutionId, { $inc: { totalCertificates: 1 } });

    return { certificate, fileBuffer };
  }

  async applyAiVerification(certificate, file, fileBuffer) {
    const aiCompatibleFile = file?.buffer ? file : { ...file, buffer: fileBuffer };
    const verificationResults = await this.performAIVerification(aiCompatibleFile);

    certificate.verificationResults = verificationResults;
    certificate.verificationStatus = this.determineVerificationStatus(verificationResults);
    await certificate.save();

    return verificationResults;
  }

  async buildCandidateSnapshot(input, file) {
    const normalizedCandidate = normalizeCertificateInput(input);
    const fileBuffer = file ? await this.getFileBuffer(file) : null;

    return {
      normalizedInput: normalizedCandidate,
      certificateId: normalizeCertificateId(normalizedCandidate.certificateId),
      certificateHash: computeCertificateHash(normalizedCandidate),
      documentHash: fileBuffer ? this.calculateDocumentHash(fileBuffer) : null,
      searchFields: deriveCertificateSearchFields(normalizedCandidate),
    };
  }

  async findTrustedCertificateMatch(candidate) {
    const hashMatch = await Certificate.findOne({ certificateHash: candidate.certificateHash });
    if (hashMatch) {
      return {
        certificate: hashMatch,
        matchType: 'certificate_hash',
      };
    }

    const certificateIdMatch = await Certificate.findOne({ certificateId: candidate.certificateId });
    if (certificateIdMatch) {
      return {
        certificate: certificateIdMatch,
        matchType: 'certificate_id',
      };
    }

    return {
      certificate: null,
      matchType: null,
    };
  }

  evaluateCandidateMatch(candidate, trustedMatch) {
    if (!trustedMatch.certificate) {
      return {
        isMatch: false,
        verificationStatus: 'suspicious',
        matchType: null,
        message: 'No trusted university certificate record was found for this document',
      };
    }

    if (trustedMatch.certificate.certificateHash === candidate.certificateHash) {
      return {
        isMatch: true,
        verificationStatus: 'verified',
        matchType: 'certificate_hash',
        message: 'Certificate matches the trusted university record',
      };
    }

    return {
      isMatch: false,
      verificationStatus: 'fake',
      matchType: trustedMatch.matchType,
      message: 'Certificate ID exists, but the uploaded certificate data does not match the trusted university record',
    };
  }

  prepareTrustedCertificateInput(input, user) {
    const normalizedInput = normalizeCertificateInput(input);
    normalizedInput.institutionId = normalizedInput.institutionId || String(user.institutionId || '').trim() || null;
    return normalizedInput;
  }

  async ensureInstitutionExists(institutionId) {
    const institution = await Institution.findById(institutionId).select('_id');
    if (!institution) {
      throw createServiceError('Institution not found', 404);
    }
  }

  async findCertificateByIdentifier(identifier) {
    const trimmedIdentifier = String(identifier || '').trim();

    if (!trimmedIdentifier) {
      return null;
    }

    if (/^[a-f\d]{24}$/i.test(trimmedIdentifier)) {
      return Certificate.findOne({ _id: trimmedIdentifier });
    }

    return Certificate.findOne({ certificateId: normalizeCertificateId(trimmedIdentifier) });
  }

  ensureRole(allowedRoles, user, message, statusCode = 400) {
    if (!allowedRoles.has(user.role)) {
      throw createServiceError(message, statusCode);
    }
  }

  wrapUnexpectedError(error, fallbackPrefix) {
    if (error?.statusCode) {
      return error;
    }

    if (error?.code === 11000) {
      return createServiceError('Certificate ID or certificate hash already exists');
    }

    return createServiceError(`${fallbackPrefix}: ${error.message}`, 500);
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
        verificationMethod: details.verificationMethod || VERIFY_METHODS.SYSTEM,
        certificateHash: certificate.certificateHash,
        actorRole: user.role || '',
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

    throw createServiceError('Uploaded file is missing a readable buffer or path');
  }
}

module.exports = CertificateService;
