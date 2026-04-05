const clearUserAccessState = (user) => {
  if (!user) {
    return user;
  }

  user.role = 'user';
  user.institutionId = null;
  user.companyName = '';

  return user;
};

const applyUserAccessProfile = (user, config, profile) => {
  clearUserAccessState(user);

  if (!profile || profile.isActive === false || typeof config?.syncUser !== 'function') {
    return user;
  }

  config.syncUser(user, profile);
  return user;
};

module.exports = {
  applyUserAccessProfile,
  clearUserAccessState,
};
