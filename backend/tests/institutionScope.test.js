const assert = require('node:assert/strict');
const { afterEach, describe, test } = require('node:test');
const CompanyAdmin = require('../models/company_admin');
const Institution = require('../models/Institution');
const Verifier = require('../models/Verifier');
const {
  canUserAccessInstitution,
  getAccessibleInstitutionIds,
  mergeInstitutionScopeIntoFilter,
} = require('../utils/institutionScope');

const originalCompanyAdminFindOne = CompanyAdmin.findOne;
const originalInstitutionFind = Institution.find;
const originalVerifierFindOne = Verifier.findOne;

afterEach(() => {
  CompanyAdmin.findOne = originalCompanyAdminFindOne;
  Institution.find = originalInstitutionFind;
  Verifier.findOne = originalVerifierFindOne;
});

describe('institutionScope helpers', () => {
  test('company admins are limited to their active institution list', async () => {
    CompanyAdmin.findOne = () => ({
      lean: async () => ({
        accessScope: 'specific_institutions',
        institutionIds: ['inst-1', 'inst-2', 'inst-1'],
      }),
    });

    const ids = await getAccessibleInstitutionIds({
      _id: 'user-1',
      role: 'company_admin',
    });

    assert.deepEqual(ids, ['inst-1', 'inst-2']);
  });

  test('internal verifiers keep global access while external verifiers stay scoped', async () => {
    Verifier.findOne = () => ({
      lean: async () => ({
        verifierType: 'internal',
        assignedInstitutionIds: ['inst-1'],
      }),
    });

    const unrestrictedIds = await getAccessibleInstitutionIds({
      _id: 'user-1',
      role: 'verifier',
    });

    assert.equal(unrestrictedIds, null);

    Verifier.findOne = () => ({
      lean: async () => ({
        verifierType: 'external',
        assignedInstitutionIds: ['inst-2', 'inst-3'],
      }),
    });

    const scopedIds = await getAccessibleInstitutionIds({
      _id: 'user-1',
      role: 'verifier',
    });

    assert.deepEqual(scopedIds, ['inst-2', 'inst-3']);
  });

  test('requested institution filters stay intersected with allowed scope', () => {
    const filter = {
      institutionId: { $in: ['inst-2', 'inst-4'] },
    };

    mergeInstitutionScopeIntoFilter(filter, ['inst-1', 'inst-2', 'inst-3']);

    assert.deepEqual(filter, {
      institutionId: { $in: ['inst-2'] },
    });
  });

  test('users without an allowed institution cannot access scoped records', async () => {
    const canAccess = await canUserAccessInstitution(
      { _id: 'user-1', role: 'user' },
      'inst-1'
    );

    assert.equal(canAccess, false);
  });
});
