const assert = require('node:assert/strict');
const { afterEach, describe, test } = require('node:test');
const CompanyAdmin = require('../models/company_admin');
const Verifier = require('../models/Verifier');
const CertificateService = require('../services/certificate_service');

const originalCompanyAdminFindOne = CompanyAdmin.findOne;
const originalVerifierFindOne = Verifier.findOne;

const createService = () => new CertificateService({
  aiService: {
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
  CompanyAdmin.findOne = originalCompanyAdminFindOne;
  Verifier.findOne = originalVerifierFindOne;
});

describe('CertificateService', () => {
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
});
