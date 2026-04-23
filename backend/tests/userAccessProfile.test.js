const assert = require('node:assert/strict');
const { describe, test } = require('node:test');
const { applyUserAccessProfile, clearUserAccessState } = require('../utils/userAccessProfile');

describe('userAccessProfile helpers', () => {
  test('clearUserAccessState removes stale role context', () => {
    const user = {
      role: 'company_admin',
      institutionId: 'inst-1',
      companyName: 'Acme Corp',
    };

    clearUserAccessState(user);

    assert.deepEqual(user, {
      role: 'user',
      institutionId: null,
      companyName: '',
    });
  });

  test('applyUserAccessProfile resets stale fields before syncing the new profile', () => {
    const user = {
      role: 'company_admin',
      institutionId: 'inst-1',
      companyName: 'Acme Corp',
    };

    const config = {
      syncUser: (targetUser, profile) => {
        targetUser.role = 'institution_admin';
        targetUser.institutionId = profile.institutionId;
      },
    };

    applyUserAccessProfile(user, config, {
      institutionId: 'inst-2',
      isActive: true,
    });

    assert.deepEqual(user, {
      role: 'institution_admin',
      institutionId: 'inst-2',
      companyName: '',
    });
  });

  test('inactive profiles leave the user as a plain user', () => {
    const user = {
      role: 'institution_admin',
      institutionId: 'inst-1',
      companyName: 'Legacy',
    };

    applyUserAccessProfile(user, { syncUser: () => {
      throw new Error('syncUser should not run for inactive profiles');
    } }, { isActive: false });

    assert.deepEqual(user, {
      role: 'user',
      institutionId: null,
      companyName: '',
    });
  });
});
