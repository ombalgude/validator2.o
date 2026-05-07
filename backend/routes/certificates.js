const express = require('express');
const crypto = require('crypto');
const fs = require('fs').promises;
const Certificate = require('../models/Certificate');
const Institution = require('../models/Institution');
const { auth, authorize } = require('../middleware/auth');
const { uploadSingle, uploadMultiple } = require('../middleware/upload');
const {
  normalizeCertificateComparisonRequest,
  normalizeCertificateRequest,
  validateCertificate,
  validateCertificateComparison,
} = require('../middleware/validation');
const { normalizeCertificateInput, parseJsonIfNeeded } = require('../utils/certificatePayload');
const { buildInstitutionScopedFilter, canUserAccessInstitution } = require('../utils/institutionScope');
const AIService = require('../services/ai_service');
const CertificateService = require('../services/certificate_service');

const router = express.Router();
const certificateService = new CertificateService();
const aiService = new AIService();

const DEFAULT_LIST_LIMIT = 10;
const MAX_LIST_LIMIT = 100;
const TRUSTED_UPLOAD_ROLES = ['admin', 'institution_admin', 'university_admin'];
const VALIDATION_ROLES = ['admin', 'institution_admin', 'university_admin', 'company_admin'];
const MANUAL_VERIFY_ROLES = ['admin', 'company_admin'];

const resolveCertificateQuery = (identifier) => {
  const trimmedIdentifier = String(identifier || '').trim();

  if (!trimmedIdentifier) {
    return null;
  }

  if (/^[a-f\d]{24}$/i.test(trimmedIdentifier)) {
    return { _id: trimmedIdentifier };
  }

  return { certificateId: trimmedIdentifier.toUpperCase() };
};

const buildCertificateFilters = async (query, user) => {
  const filter = {};

  if (query.status) {
    filter.verificationStatus = query.status;
  }

  if (query.institutionId) {
    filter.institutionId = query.institutionId;
  }

  if (query.studentName) {
    filter.studentName = { $regex: query.studentName, $options: 'i' };
  }

  if (query.rollNumber) {
    filter.rollNumber = { $regex: query.rollNumber, $options: 'i' };
  }

  if (query.certificateId) {
    filter.certificateId = String(query.certificateId).trim().toUpperCase();
  }

  if (query.certificateHash) {
    filter.certificateHash = String(query.certificateHash).trim().toLowerCase();
  }

  if (query.dateFrom || query.dateTo) {
    filter.uploadedAt = {};

    if (query.dateFrom) {
      filter.uploadedAt.$gte = new Date(query.dateFrom);
    }

    if (query.dateTo) {
      filter.uploadedAt.$lte = new Date(query.dateTo);
    }
  }

  return buildInstitutionScopedFilter(filter, user);
};

const canAccessCertificateForUser = async (user, certificate) =>
  canUserAccessInstitution(user, certificate.institutionId?._id || certificate.institutionId);

const sendServiceError = (res, error, fallbackMessage) => {
  if (error?.statusCode) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  if (error?.code === 11000) {
    return res.status(400).json({ message: 'Certificate ID or certificate hash already exists' });
  }

  return res.status(500).json({ message: fallbackMessage });
};

const buildRequestDetails = (req) => ({
  ipAddress: req.ip,
  userAgent: req.get('User-Agent'),
});

const toText = (value) => (value === null || value === undefined ? '' : String(value).trim());

const escapeRegex = (value) => toText(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeDateInput = (value) => {
  const rawValue = toText(value);
  if (!rawValue) {
    return '';
  }

  const parsedDate = new Date(rawValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return parsedDate.toISOString().slice(0, 10);
};

const extractYear = (structuredData, rawText, issueDate) => {
  const explicitYear = toText(structuredData.exam_year || structuredData.year);
  if (explicitYear) {
    return explicitYear;
  }

  if (issueDate) {
    return issueDate.slice(0, 4);
  }

  const matches = toText(rawText).match(/\b(?:19|20)\d{2}\b/g);
  return matches?.[matches.length - 1] || '';
};

const extractSession = (structuredData, rawText, year) => {
  const explicitSession = toText(structuredData.exam_session || structuredData.session);
  if (explicitSession) {
    return explicitSession;
  }

  const text = toText(rawText);
  const sessionMatch = text.match(
    /\b(?:summer|winter|spring|fall|autumn|monsoon|annual|semester\s+[ivx\d]+|sem\s+[ivx\d]+)\b(?:\s*[-/]\s*(?:19|20)\d{2})?/i
  );

  return sessionMatch ? sessionMatch[0].trim() : year;
};

const extractInstitutionCode = (structuredData, rawText) => {
  const explicitCode = toText(
    structuredData.institution_code || structuredData.college_code || structuredData.code
  );
  if (explicitCode) {
    return explicitCode.toUpperCase();
  }

  const codeMatch = toText(rawText).match(
    /\b(?:college|institution|university)\s*(?:code|id)\s*[:#-]?\s*([A-Z0-9_-]{2,20})\b/i
  );

  return codeMatch ? codeMatch[1].toUpperCase() : '';
};

const extractSerialNumber = (structuredData, rawText) => {
  const explicitSerial = toText(
    structuredData.serial_no || structuredData.serial_number || structuredData.certificate_no
  );
  if (explicitSerial) {
    return explicitSerial.toUpperCase();
  }

  const serialMatch = toText(rawText).match(
    /\b(?:serial|certificate|cert|registration)\s*(?:no|number|id)?\s*[:#-]?\s*([A-Z0-9_-]{4,64})\b/i
  );

  return serialMatch ? serialMatch[1].toUpperCase() : '';
};

const buildCourseCode = (value) => {
  const words = toText(value)
    .replace(/[^a-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return '';
  }

  const initials = words.map((word) => word[0]).join('').toUpperCase();
  if (initials.length >= 2) {
    return initials.slice(0, 12);
  }

  return words.join('').toUpperCase().slice(0, 12);
};

const extractSgpa = (grades) => {
  if (!grades || typeof grades !== 'object') {
    return '';
  }

  const gradeText = Object.values(grades).join(' ');
  const sgpaMatch = gradeText.match(/\b([0-9](?:\.[0-9]+)?|10(?:\.0+)?)\s*(?:\/\s*10)?\b/);
  return sgpaMatch ? sgpaMatch[1] : '';
};

const getInstitutionForExtraction = async (user, structuredData, rawText) => {
  if (user.role !== 'admin') {
    const institutionId = user.institutionId || user.institution?._id || user.institution?.id;
    if (!institutionId) {
      return { institution: null, unresolvedInstitutionName: '' };
    }

    return {
      institution: await Institution.findById(institutionId).select('name code'),
      unresolvedInstitutionName: '',
    };
  }

  const institutionName = toText(
    structuredData.institution_name || structuredData.institution || structuredData.college_name
  );
  const institutionCode = extractInstitutionCode(structuredData, rawText);
  const institutionQuery = [];

  if (institutionCode) {
    institutionQuery.push({ code: institutionCode });
  }

  if (institutionName) {
    institutionQuery.push({ name: { $regex: escapeRegex(institutionName), $options: 'i' } });
  }

  if (institutionQuery.length === 0) {
    return { institution: null, unresolvedInstitutionName: '' };
  }

  return {
    institution: await Institution.findOne({ $or: institutionQuery }).select('name code'),
    unresolvedInstitutionName: institutionName,
  };
};

const buildCertificateDataFromAiResult = async ({ aiResult, fileBuffer, user }) => {
  const structuredData = aiResult.structured_data || {};
  const rawText = aiResult.text || '';
  const issueDate = normalizeDateInput(structuredData.issue_date);
  const year = extractYear(structuredData, rawText, issueDate);
  const session = extractSession(structuredData, rawText, year);
  const course = toText(structuredData.course || structuredData.degree);
  const degree = toText(structuredData.degree);
  const institutionResolution = await getInstitutionForExtraction(user, structuredData, rawText);
  const institution = institutionResolution.institution;
  const extractedInstitutionName = institutionResolution.unresolvedInstitutionName ||
    toText(structuredData.institution_name || structuredData.institution || structuredData.college_name);
  const institutionName = toText(institution?.name) || extractedInstitutionName;
  const institutionCode = toText(institution?.code) || extractInstitutionCode(structuredData, rawText);
  const serialNo = extractSerialNumber(structuredData, rawText);
  const certificateId = toText(structuredData.certificate_id || structuredData.certificateId) ||
    serialNo ||
    certificateService.generateCertificateId();
  const subjectCourseName = toText(structuredData.subject || structuredData.subject_name) || course || degree;
  const subjectCourseCode = toText(structuredData.subject_code) || buildCourseCode(subjectCourseName);
  const documentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  const certificateData = {
    certificateId,
    institutionId: institution?._id ? String(institution._id) : '',
    student: {
      name: toText(structuredData.student_name || structuredData.studentName),
      seatNo: toText(structuredData.roll_number || structuredData.rollNumber).toUpperCase(),
      prn: toText(structuredData.prn).toUpperCase(),
      motherName: toText(structuredData.mother_name || structuredData.motherName),
    },
    college: {
      code: institutionCode.toUpperCase(),
      name: institutionName,
    },
    exam: {
      session,
      year,
      course,
      branchCode: toText(structuredData.branch_code || structuredData.branchCode).toUpperCase(),
    },
    subjects: [
      {
        courseCode: subjectCourseCode,
        courseName: subjectCourseName,
        type: degree,
        credits: '',
        grade: toText(structuredData.grade || structuredData.result).toUpperCase(),
        creditPoints: '',
      },
    ],
    summary: {
      sgpa: extractSgpa(structuredData.grades),
      totalCredits: '',
    },
    issue: {
      date: issueDate,
      serialNo,
    },
  };

  const requiredFields = [
    ['institution', certificateData.institutionId],
    ['certificate ID', certificateData.certificateId],
    ['student name', certificateData.student.name],
    ['seat number', certificateData.student.seatNo],
    ['college code', certificateData.college.code],
    ['college name', certificateData.college.name],
    ['course', certificateData.exam.course],
    ['exam session', certificateData.exam.session],
    ['exam year', certificateData.exam.year],
    ['issue date', certificateData.issue.date],
    ['subject code', certificateData.subjects[0].courseCode],
    ['subject name', certificateData.subjects[0].courseName],
  ];
  const missingRequiredFields = requiredFields
    .filter(([, value]) => !toText(value))
    .map(([label]) => label);
  const warnings = [];

  if (!toText(structuredData.certificate_id || structuredData.certificateId)) {
    warnings.push('Certificate ID was generated because AI did not find a certificate number in the document.');
  }

  if (user.role === 'admin' && extractedInstitutionName && !institution) {
    warnings.push(`AI extracted "${extractedInstitutionName}", but no matching institution record was found.`);
  }

  if (subjectCourseName && !toText(structuredData.subject || structuredData.subject_name)) {
    warnings.push('AI did not find a subject list, so the extracted course was used for the required subject record.');
  }

  return {
    certificateData,
    documentHash,
    missingRequiredFields,
    warnings,
  };
};

const hasDateValue = (value) => {
  if (!value) {
    return false;
  }

  const parsedDate = value instanceof Date ? value : new Date(value);
  return !Number.isNaN(parsedDate.getTime());
};

const mergeCandidateCertificateData = (aiCertificateData = {}, submittedData = {}) => {
  const aiData = normalizeCertificateInput(aiCertificateData);
  const manualData = normalizeCertificateInput(submittedData);

  return {
    certificateId: manualData.certificateId || aiData.certificateId,
    institutionId: manualData.institutionId || aiData.institutionId,
    student: {
      name: manualData.student.name || aiData.student.name,
      seatNo: manualData.student.seatNo || aiData.student.seatNo,
      prn: manualData.student.prn || aiData.student.prn,
      motherName: manualData.student.motherName || aiData.student.motherName,
    },
    college: {
      code: manualData.college.code || aiData.college.code,
      name: manualData.college.name || aiData.college.name,
    },
    exam: {
      session: manualData.exam.session || aiData.exam.session,
      year: manualData.exam.year || aiData.exam.year,
      course: manualData.exam.course || aiData.exam.course,
      branchCode: manualData.exam.branchCode || aiData.exam.branchCode,
    },
    subjects: manualData.subjects.length > 0 ? manualData.subjects : aiData.subjects,
    summary: {
      sgpa: manualData.summary.sgpa ?? aiData.summary.sgpa,
      totalCredits: manualData.summary.totalCredits ?? aiData.summary.totalCredits,
    },
    issue: {
      date: manualData.issue.date || aiData.issue.date,
      serialNo: manualData.issue.serialNo || aiData.issue.serialNo,
    },
  };
};

const getMissingComparisonFields = (candidateData = {}) => {
  const normalized = normalizeCertificateInput(candidateData);
  const firstSubject = normalized.subjects[0] || {};
  const requiredFields = [
    ['certificate ID', normalized.certificateId],
    ['student name', normalized.student.name],
    ['seat number', normalized.student.seatNo],
    ['college code', normalized.college.code],
    ['college name', normalized.college.name],
    ['course', normalized.exam.course],
    ['exam session', normalized.exam.session],
    ['exam year', normalized.exam.year],
    ['issue date', hasDateValue(normalized.issue.date)],
    ['subject code', firstSubject.courseCode],
    ['subject name', firstSubject.courseName],
  ];

  return requiredFields
    .filter(([, value]) => !value)
    .map(([label]) => label);
};

const extractCandidateDataWithAi = async (req) => {
  if (!req.file) {
    return {
      candidateInput: req.body,
      aiExtraction: null,
    };
  }

  const fileBuffer = req.file.buffer || await fs.readFile(req.file.path);
  const aiResult = await aiService.extractText(
    { ...req.file, buffer: fileBuffer },
    { document_type: 'certificate' }
  );

  if (!aiResult.success) {
    const error = new Error(aiResult.error || 'AI service could not extract candidate certificate details.');
    error.statusCode = 502;
    throw error;
  }

  const mappedResult = await buildCertificateDataFromAiResult({
    aiResult,
    fileBuffer,
    user: req.user,
  });
  const candidateInput = mergeCandidateCertificateData(mappedResult.certificateData, req.body);

  return {
    candidateInput,
    aiExtraction: {
      confidence: aiResult.confidence || 0,
      processingTime: aiResult.processing_time || 0,
      missingRequiredFields: getMissingComparisonFields(candidateInput),
      warnings: mappedResult.warnings,
    },
  };
};

router.post(
  '/extract',
  auth,
  authorize(...TRUSTED_UPLOAD_ROLES),
  uploadSingle,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Please upload a certificate file.' });
      }

      const fileBuffer = req.file.buffer || await fs.readFile(req.file.path);
      const aiResult = await aiService.extractText(
        { ...req.file, buffer: fileBuffer },
        { document_type: 'certificate' }
      );

      if (!aiResult.success) {
        return res.status(502).json({
          success: false,
          message: aiResult.error || 'AI service could not extract certificate details.',
        });
      }

      const mappedResult = await buildCertificateDataFromAiResult({
        aiResult,
        fileBuffer,
        user: req.user,
      });

      return res.json({
        success: mappedResult.missingRequiredFields.length === 0,
        message: mappedResult.missingRequiredFields.length === 0
          ? 'Certificate details extracted successfully.'
          : 'AI extraction completed, but some required registration fields are missing.',
        certificateData: mappedResult.certificateData,
        extraction: {
          confidence: aiResult.confidence || 0,
          processingTime: aiResult.processing_time || 0,
          missingRequiredFields: mappedResult.missingRequiredFields,
          warnings: mappedResult.warnings,
        },
      });
    } catch (error) {
      console.error('Certificate extraction error:', error);
      sendServiceError(res, error, 'Server error during certificate detail extraction');
    } finally {
      if (req.file?.path) {
        fs.unlink(req.file.path).catch(() => {});
      }
    }
  }
);

router.post(
  '/verify',
  auth,
  authorize(...TRUSTED_UPLOAD_ROLES),
  uploadSingle,
  normalizeCertificateRequest,
  validateCertificate,
  async (req, res) => {
    try {
      const result = await certificateService.uploadAndVerify(
        req.file,
        req.user,
        req.body,
        buildRequestDetails(req)
      );
      res.status(201).json(result);
    } catch (error) {
      console.error('Certificate upload error:', error);
      sendServiceError(res, error, 'Server error during certificate upload');
    }
  }
);

router.post(
  '/bulk',
  auth,
  authorize(...TRUSTED_UPLOAD_ROLES),
  uploadMultiple,
  async (req, res) => {
    try {
      const records = parseJsonIfNeeded(req.body.records, []);
      const result = await certificateService.createBulkTrustedCertificates(req.files, records, req.user);
      res.status(201).json(result);
    } catch (error) {
      console.error('Bulk upload error:', error);
      sendServiceError(res, error, 'Server error during bulk upload');
    }
  }
);

router.post(
  '/validate',
  auth,
  authorize(...VALIDATION_ROLES),
  uploadSingle,
  normalizeCertificateComparisonRequest,
  validateCertificateComparison,
  async (req, res) => {
    try {
      const { candidateInput, aiExtraction } = await extractCandidateDataWithAi(req);
      const missingFields = getMissingComparisonFields(candidateInput);

      if (missingFields.length > 0) {
        return res.status(422).json({
          success: false,
          message: `Candidate certificate data is missing required fields: ${missingFields.join(', ')}.`,
          missingRequiredFields: missingFields,
          aiExtraction,
        });
      }

      const result = await certificateService.compareCandidateCertificate(
        candidateInput,
        req.user,
        req.file,
        buildRequestDetails(req)
      );

      res.json({
        ...result,
        aiExtraction,
      });
    } catch (error) {
      console.error('Candidate certificate validation error:', error);
      sendServiceError(res, error, 'Server error during certificate validation');
    } finally {
      if (req.file?.path) {
        fs.unlink(req.file.path).catch(() => {});
      }
    }
  }
);

router.get('/:id', auth, async (req, res) => {
  try {
    const certificateQuery = resolveCertificateQuery(req.params.id);
    if (!certificateQuery) {
      return res.status(400).json({ message: 'Certificate identifier is required' });
    }

    const certificate = await Certificate.findOne(certificateQuery)
      .populate('institutionId', 'name code')
      .populate('uploadedBy', 'email role');

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    if (!(await canAccessCertificateForUser(req.user, certificate))) {
      return res.status(403).json({ message: 'Access denied for this certificate' });
    }

    res.json(certificateService.formatCertificateForResponse(certificate));
  } catch (error) {
    console.error('Get certificate error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT);
    const sortBy = ['createdAt', 'uploadedAt', 'issueDate', 'studentName', 'certificateId'].includes(req.query.sortBy)
      ? req.query.sortBy
      : 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const filter = await buildCertificateFilters(req.query, req.user);

    const certificates = await Certificate.find(filter)
      .populate('institutionId', 'name code')
      .populate('uploadedBy', 'email role')
      .sort({ [sortBy]: sortOrder })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Certificate.countDocuments(filter);

    res.json({
      certificates: certificates.map((certificate) =>
        certificateService.formatCertificateForResponse(certificate)
      ),
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/verify', auth, authorize(...MANUAL_VERIFY_ROLES), async (req, res) => {
  try {
    const result = await certificateService.updateVerificationStatus(
      req.params.id,
      req.body,
      req.user,
      buildRequestDetails(req)
    );

    res.json(result);
  } catch (error) {
    console.error('Update verification error:', error);
    sendServiceError(res, error, 'Server error');
  }
});

module.exports = router;
