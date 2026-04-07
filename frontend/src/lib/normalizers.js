const toText = (value) => (value === null || value === undefined ? "" : String(value));

export function normalizeInstitutionSummary(value) {
	if (!value) {
		return null;
	}

	if (typeof value === "string") {
		return {
			id: value,
			name: "",
			code: "",
			institutionType: "",
			isVerified: false,
		};
	}

	return {
		id: value.id || value._id || "",
		name: toText(value.name).trim(),
		code: toText(value.code).trim(),
		institutionType: toText(value.institutionType).trim(),
		isVerified: Boolean(value.isVerified),
	};
}

export function normalizeUser(value) {
	if (!value) {
		return null;
	}

	const institution = normalizeInstitutionSummary(value.institutionId);

	return {
		id: value.id || value._id || "",
		fullName: toText(value.fullName).trim(),
		email: toText(value.email).trim().toLowerCase(),
		role: toText(value.role).trim(),
		institutionId: institution?.id || "",
		institution,
		companyName: toText(value.companyName).trim(),
		permissions: Array.isArray(value.permissions) ? value.permissions : [],
		isActive: value.isActive !== false,
		emailVerified: Boolean(value.emailVerified),
		lastLogin: value.lastLogin || null,
	};
}
