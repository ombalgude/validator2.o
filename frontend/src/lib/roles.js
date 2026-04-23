export const TRUSTED_UPLOAD_ROLES = [
	"admin",
	"institution_admin",
	"university_admin",
];

export const CANDIDATE_VALIDATION_ROLES = [
	"admin",
	"institution_admin",
	"university_admin",
	"company_admin",
];

export const MANUAL_STATUS_UPDATE_ROLES = [
	"admin",
	"company_admin",
];

export const SIGNUP_ROLE_OPTIONS = [
	{
		value: "institution_admin",
		label: "Institution Admin",
		description: "Trusted upload access activates after institution assignment.",
	},
	{
		value: "university_admin",
		label: "University Admin",
		description: "University upload access activates after institution assignment.",
	},
	{
		value: "company_admin",
		label: "Company Admin",
		description: "Validation and review access activates after company assignment.",
	},
];

function hasInstitutionScope(user) {
	return Boolean(user?.institution?.id || user?.institutionId);
}

export function getDefaultRouteForRole(role, user = null) {
	switch (role) {
		case "admin":
			return "/dashboard";
		case "institution_admin":
		case "university_admin":
			return hasInstitutionScope(user) ? "/upload" : "/certificates";
		case "company_admin":
		case "user":
		default:
			return "/certificates";
	}
}

export function canAccessDashboard(role) {
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
