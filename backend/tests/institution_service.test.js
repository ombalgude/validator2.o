const assert = require('node:assert/strict');
const { afterEach, describe, test } = require('node:test');
const Institution = require('../models/Institution');
const InstitutionService = require('../services/institution_service');

const originalInstitutionFindById = Institution.findById;

afterEach(() => {
  Institution.findById = originalInstitutionFindById;
});

describe('InstitutionService', () => {
  test('buildInstitutionQuery supports university-admin scoping and route filters', () => {
    const service = new InstitutionService();
    const query = service.buildInstitutionQuery(
      {
        search: 'pune',
        verified: 'true',
        institutionType: 'university',
        city: 'Pune',
      },
      {
        role: 'university_admin',
        institutionId: 'inst-1',
      }
    );

    assert.deepEqual(query, {
      $or: [
        { name: { $regex: 'pune', $options: 'i' } },
        { code: { $regex: 'pune', $options: 'i' } },
      ],
      isVerified: true,
      institutionType: 'university',
      'address.city': { $regex: 'Pune', $options: 'i' },
      _id: 'inst-1',
    });
  });

  test('canAccessInstitution includes university admins for their own institution', () => {
    const service = new InstitutionService();

    assert.equal(
      service.canAccessInstitution(
        { _id: 'inst-1' },
        { role: 'university_admin', institutionId: 'inst-1' }
      ),
      true
    );

    assert.equal(
      service.canAccessInstitution(
        { _id: 'inst-2' },
        { role: 'university_admin', institutionId: 'inst-1' }
      ),
      false
    );
  });

  test('verifyInstitution can also unverify institutions', async () => {
    const mockInstitution = {
      _id: 'inst-1',
      isVerified: true,
      updatedBy: null,
      verificationReason: 'old reason',
      verifiedBy: 'admin-old',
      verifiedAt: new Date(),
      save: async () => {},
    };

    Institution.findById = async () => mockInstitution;

    const service = new InstitutionService();
    const result = await service.verifyInstitution(
      'inst-1',
      { _id: 'admin-1', role: 'admin' },
      false,
      'manual reset'
    );

    assert.equal(mockInstitution.isVerified, false);
    assert.equal(mockInstitution.updatedBy, 'admin-1');
    assert.equal(mockInstitution.verificationReason, 'manual reset');
    assert.equal(mockInstitution.verifiedBy, null);
    assert.equal(mockInstitution.verifiedAt, null);
    assert.equal(result.message, 'Institution unverified successfully');
  });
});
