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
	"verifier",
];

export const MANUAL_STATUS_UPDATE_ROLES = [
	"admin",
	"verifier",
	"company_admin",
];

export function getDefaultRouteForRole(role) {
	switch (role) {
		case "admin":
			return "/dashboard";
		case "institution_admin":
		case "university_admin":
			return "/upload";
		case "company_admin":
		case "verifier":
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
