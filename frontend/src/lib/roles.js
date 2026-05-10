export const AUTH_ROLES = [
	"admin",
	"university_admin",
	"institution_admin",
	"company_admin",
];

export const TRUSTED_UPLOAD_ROLES = [
	"admin",
	"university_admin",
];

export const CANDIDATE_VALIDATION_ROLES = [
	"institution_admin",
	"company_admin",
];

export const MANUAL_STATUS_UPDATE_ROLES = [
	"admin",
	"company_admin",
];

export const SIGNUP_ROLE_OPTIONS = [
	{
		value: "university_admin",
		label: "University Admin",
		description: "University workspace access can be scoped after signup.",
	},
	{
		value: "institution_admin",
		label: "Institution Admin",
		description: "Institution workspace access can be scoped after signup.",
	},
	{
		value: "company_admin",
		label: "Company Admin",
		description: "Company access details can be completed after signup.",
	},
];

function hasInstitutionScope(user) {
	return Boolean(user?.institution?.id || user?.institutionId);
}

export function getDefaultRouteForRole(role, user = null) {
	if (!isKnownRole(role)) {
		return "/login";
	}

	switch (role) {
		case "admin":
			return "/dashboard";
		case "university_admin":
			return hasInstitutionScope(user) ? "/upload" : "/certificates";
		case "institution_admin":
		case "company_admin":
			return "/certificates";
		default:
			return "/login";
	}
}

export function isKnownRole(role) {
	return AUTH_ROLES.includes(role);
}

export function canAccessDashboard(role) {
	return role === "admin";
}

export function canManageUniversityAdminApprovals(role) {
	return role === "admin";
}

export function canManageInstituteApprovals(role) {
	return role === "admin";
}

export function canUploadTrustedCertificates(role) {
	return TRUSTED_UPLOAD_ROLES.includes(role);
}

export function canValidateCandidate(role) {
	return CANDIDATE_VALIDATION_ROLES.includes(role);
}

export function canManuallyUpdateCertificate(role) {
	return MANUAL_STATUS_UPDATE_ROLES.includes(role);
}

export function formatRoleLabel(role) {
	return toTitleCase(String(role || "").replaceAll("_", " "));
}

function toTitleCase(value) {
	return value.replace(/\b\w/g, (character) => character.toUpperCase());
}
