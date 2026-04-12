const assert = require('node:assert/strict');
const { afterEach, describe, test } = require('node:test');
const Certificate = require('../models/Certificate');
const CompanyAdmin = require('../models/company_admin');
const Verifier = require('../models/Verifier');
const CertificateService = require('../services/certificate_service');
const { computeCertificateHash } = require('../utils/certificatePayload');

const originalCertificateFindOne = Certificate.findOne;
const originalCompanyAdminFindOne = CompanyAdmin.findOne;
const originalVerifierFindOne = Verifier.findOne;

const createService = () => new CertificateService({
  aiService: {
    completeVerification: async () => ({
      success: true,
      verification_status: 'verified',
      confidence_score: 92,
      ocr_results: { confidence: 90, text: 'sample text' },
      tampering_results: { confidence_score: 5, tampering_detected: false },
      template_results: { match_score: 91, template_id: 'template-1' },
      anomaly_results: { anomaly_score: 4, anomalies: [] },
      recommendations: [],
      processing_time: 25,
      orchestration_results: {
        validation_results: {
          overall_status: 'Passed',
        },
        integration_requirements: [],
        ledger_update: [],
      },
    }),
    extractText: async () => ({ confidence: 90, text: 'sample text' }),
    detectTampering: async () => ({ tampering_score: 5, tampering_detected: false }),
    matchTemplate: async () => ({ match_score: 91, template_id: 'template-1' }),
    detectAnomalies: async () => ({ anomaly_score: 4, anomalies: [] }),
  },
  notificationService: {
    sendVerificationComplete: async () => {},
    sendStatusUpdate: async () => {},
  },
});

afterEach(() => {
  Certificate.findOne = originalCertificateFindOne;
  CompanyAdmin.findOne = originalCompanyAdminFindOne;
  Verifier.findOne = originalVerifierFindOne;
});

const SAMPLE_CERTIFICATE_INPUT = {
  certificateId: 'cert-123',
  student: {
    name: 'Asha Patil',
    seatNo: 'seat-101',
    prn: 'prn-101',
  },
  college: {
    code: 'ENG01',
    name: 'Engineering College',
  },
  exam: {
    session: 'Summer',
    year: '2025',
    course: 'B.Tech',
  },
  subjects: [
    {
      courseCode: 'CS101',
      courseName: 'Algorithms',
      credits: 4,
      grade: 'A',
    },
  ],
  summary: {
    sgpa: 8.5,
    totalCredits: 4,
  },
  issue: {
    date: '2025-06-01',
    serialNo: 'SER-1',
  },
};

describe('CertificateService', () => {
  test('performAIVerification prefers the complete verification payload when available', async () => {
    const service = createService();

    const result = await service.performAIVerification({
      originalname: 'certificate.png',
      mimetype: 'image/png',
      buffer: Buffer.from('sample'),
    });

    assert.equal(result.ocrConfidence, 90);
    assert.equal(result.tamperScore, 5);
    assert.equal(result.templateMatch, 91);
    assert.equal(result.anomalyScore, 4);
    assert.equal(result.orchestrator.validation_results.overall_status, 'Passed');
  });

  test('buildCertificateQuery keeps company admins within their scoped institutions', async () => {
    CompanyAdmin.findOne = () => ({
      lean: async () => ({
        accessScope: 'specific_institutions',
        institutionIds: ['inst-1', 'inst-2'],
      }),
    });

    const service = createService();
    const query = await service.buildCertificateQuery(
      {
        verificationStatus: 'verified',
        institutionId: 'inst-2',
        certificateId: 'cert-123',
      },
      {
        _id: 'user-1',
        role: 'company_admin',
      }
    );

    assert.deepEqual(query, {
      verificationStatus: 'verified',
      institutionId: { $in: ['inst-2'] },
      certificateId: 'CERT-123',
    });
  });

  test('external verifiers cannot access certificates outside their assigned institutions', async () => {
    Verifier.findOne = () => ({
      lean: async () => ({
        verifierType: 'external',
        assignedInstitutionIds: ['inst-1'],
      }),
    });

    const service = createService();
    const canAccess = await service.canAccessCertificate(
      { institutionId: 'inst-2' },
      { _id: 'user-1', role: 'verifier' }
    );

    assert.equal(canAccess, false);
  });

  test('institution-level upload permissions stay limited to the user institution', () => {
    const service = createService();

    assert.equal(
      service.canUploadToInstitution(
        { role: 'institution_admin', institutionId: 'inst-1' },
        'inst-1'
      ),
      true
    );

    assert.equal(
      service.canUploadToInstitution(
        { role: 'institution_admin', institutionId: 'inst-1' },
        'inst-2'
      ),
      false
    );
  });

  test('compareCandidateCertificate returns verified when the trusted hash matches', async () => {
    const service = createService();
    const candidateHash = computeCertificateHash(SAMPLE_CERTIFICATE_INPUT);
    const trustedCertificate = {
      _id: 'cert-1',
      certificateId: 'CERT-123',
      certificateHash: candidateHash,
      institutionId: 'inst-1',
      uploadedBy: 'user-1',
      student: SAMPLE_CERTIFICATE_INPUT.student,
      college: SAMPLE_CERTIFICATE_INPUT.college,
      exam: SAMPLE_CERTIFICATE_INPUT.exam,
      subjects: SAMPLE_CERTIFICATE_INPUT.subjects,
      summary: SAMPLE_CERTIFICATE_INPUT.summary,
      issue: { date: new Date('2025-06-01'), serialNo: 'SER-1' },
      studentName: 'Asha Patil',
      rollNumber: 'SEAT-101',
      course: 'B.Tech',
      issueDate: new Date('2025-06-01'),
      verificationStatus: 'pending',
      originalFileName: 'trusted.pdf',
    };
    let loggedResult = null;

    Certificate.findOne = async (query) => {
      if (query.certificateHash === candidateHash) {
        return trustedCertificate;
      }

      return null;
    };
    service.logVerification = async (_certificate, _user, result) => {
      loggedResult = result;
    };

    const result = await service.compareCandidateCertificate(
      SAMPLE_CERTIFICATE_INPUT,
      { _id: 'admin-1', role: 'admin' }
    );

    assert.equal(result.isMatch, true);
    assert.equal(result.verificationStatus, 'verified');
    assert.equal(result.matchType, 'certificate_hash');
    assert.equal(result.candidateCertificate.certificateHash, candidateHash);
    assert.equal(result.trustedCertificate.certificateId, 'CERT-123');
    assert.equal(loggedResult, 'verified');
  });

  test('compareCandidateCertificate returns fake when certificate id exists but content hash differs', async () => {
    const service = createService();
    const candidateHash = computeCertificateHash(SAMPLE_CERTIFICATE_INPUT);
    let certificateHashLookupCount = 0;

    Certificate.findOne = async (query) => {
      if (query.certificateHash) {
        certificateHashLookupCount += 1;
        return null;
      }

      if (query.certificateId === 'CERT-123') {
        return {
          _id: 'cert-2',
          certificateId: 'CERT-123',
          certificateHash: 'f'.repeat(64),
          institutionId: 'inst-1',
          uploadedBy: 'user-1',
          student: SAMPLE_CERTIFICATE_INPUT.student,
          college: SAMPLE_CERTIFICATE_INPUT.college,
          exam: SAMPLE_CERTIFICATE_INPUT.exam,
          subjects: SAMPLE_CERTIFICATE_INPUT.subjects,
          summary: SAMPLE_CERTIFICATE_INPUT.summary,
          issue: { date: new Date('2025-06-01'), serialNo: 'SER-1' },
          studentName: 'Asha Patil',
          rollNumber: 'SEAT-101',
          course: 'B.Tech',
          issueDate: new Date('2025-06-01'),
          verificationStatus: 'pending',
          originalFileName: 'trusted.pdf',
        };
      }

      return null;
    };
    service.logVerification = async () => {};

    const result = await service.compareCandidateCertificate(
      SAMPLE_CERTIFICATE_INPUT,
      { _id: 'admin-1', role: 'admin' }
    );

    assert.equal(certificateHashLookupCount, 1);
    assert.equal(result.isMatch, false);
    assert.equal(result.verificationStatus, 'fake');
    assert.equal(result.matchType, 'certificate_id');
    assert.equal(result.candidateCertificate.certificateHash, candidateHash);
    assert.ok(result.message.includes('does not match'));
  });

  test('compareCandidateCertificate returns suspicious when no trusted record exists', async () => {
    const service = createService();

    Certificate.findOne = async () => null;
    service.logVerification = async () => {
      throw new Error('logVerification should not run when no trusted record exists');
    };

    const result = await service.compareCandidateCertificate(
      SAMPLE_CERTIFICATE_INPUT,
      { _id: 'admin-1', role: 'admin' }
    );

    assert.equal(result.isMatch, false);
    assert.equal(result.verificationStatus, 'suspicious');
    assert.equal(result.matchType, null);
    assert.equal(result.trustedCertificate, null);
  });
});
