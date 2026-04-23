const assert = require('node:assert/strict');
const { afterEach, describe, test } = require('node:test');
const CompanyAdmin = require('../models/company_admin');
const Institution = require('../models/Institution');
const {
  canUserAccessInstitution,
  getAccessibleInstitutionIds,
  mergeInstitutionScopeIntoFilter,
} = require('../utils/institutionScope');

const originalCompanyAdminFindOne = CompanyAdmin.findOne;
const originalInstitutionFind = Institution.find;

afterEach(() => {
  CompanyAdmin.findOne = originalCompanyAdminFindOne;
  Institution.find = originalInstitutionFind;
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
