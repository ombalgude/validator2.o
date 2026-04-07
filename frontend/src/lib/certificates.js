import { normalizeInstitutionSummary } from "./normalizers";

export const CERTIFICATE_STATUSES = [
	"verified",
	"suspicious",
	"fake",
	"pending",
];

export const MAX_CERTIFICATE_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_BULK_FILES = 10;

export const ALLOWED_CERTIFICATE_EXTENSIONS = [
	".pdf",
	".jpg",
	".jpeg",
	".png",
	".tiff",
	".tif",
];

export const ALLOWED_CERTIFICATE_MIME_TYPES = [
	"application/pdf",
	"image/jpeg",
	"image/jpg",
	"image/png",
	"image/tiff",
];

const EMPTY_CERTIFICATE_FORM = {
	certificateId: "",
	institutionId: "",
	student: {
		name: "",
		seatNo: "",
		prn: "",
		motherName: "",
	},
	college: {
		code: "",
		name: "",
	},
	exam: {
		session: "",
		year: "",
		course: "",
		branchCode: "",
	},
	subjects: [],
	summary: {
		sgpa: "",
		totalCredits: "",
	},
	issue: {
		date: "",
		serialNo: "",
	},
};

function toText(value) {
	return value === null || value === undefined ? "" : String(value);
}

function toUpper(value) {
	return toText(value).trim().toUpperCase();
}

function toNumberOrNull(value) {
	if (value === "" || value === null || value === undefined) {
		return null;
	}

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function toDateInputValue(value) {
	if (!value) {
		return "";
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "";
	}

	return date.toISOString().slice(0, 10);
}

function sanitizeSubject(subject) {
	return {
		courseCode: toUpper(subject.courseCode),
		courseName: toText(subject.courseName).trim(),
		type: toText(subject.type).trim(),
		credits: toNumberOrNull(subject.credits),
		grade: toUpper(subject.grade),
		creditPoints: toNumberOrNull(subject.creditPoints),
	};
}

export function createEmptySubject() {
	return {
		courseCode: "",
		courseName: "",
		type: "",
		credits: "",
		grade: "",
		creditPoints: "",
	};
}

export function createEmptyCertificateForm() {
	return {
		...EMPTY_CERTIFICATE_FORM,
		student: { ...EMPTY_CERTIFICATE_FORM.student },
		college: { ...EMPTY_CERTIFICATE_FORM.college },
		exam: { ...EMPTY_CERTIFICATE_FORM.exam },
		subjects: [createEmptySubject()],
		summary: { ...EMPTY_CERTIFICATE_FORM.summary },
		issue: { ...EMPTY_CERTIFICATE_FORM.issue },
	};
}

export function setCertificateRootField(values, field, nextValue) {
	return {
		...values,
		[field]: nextValue,
	};
}

export function setCertificateSectionField(values, section, field, nextValue) {
	return {
		...values,
		[section]: {
			...values[section],
			[field]: nextValue,
		},
	};
}

export function setCertificateSubjectField(values, index, field, nextValue) {
	return {
		...values,
		subjects: values.subjects.map((subject, subjectIndex) =>
			subjectIndex === index
				? {
						...subject,
						[field]: nextValue,
				  }
				: subject
		),
	};
}

export function addCertificateSubject(values) {
	return {
		...values,
		subjects: [...values.subjects, createEmptySubject()],
	};
}

export function removeCertificateSubject(values, index) {
	const nextSubjects = values.subjects.filter(
		(_subject, subjectIndex) => subjectIndex !== index
	);

	return {
		...values,
		subjects: nextSubjects.length > 0 ? nextSubjects : [createEmptySubject()],
	};
}

export function normalizeCertificatePayload(values) {
	const payload = {
		certificateId: toUpper(values.certificateId),
		student: {
			name: toText(values.student?.name).trim(),
			seatNo: toUpper(values.student?.seatNo),
			prn: toUpper(values.student?.prn),
			motherName: toText(values.student?.motherName).trim(),
		},
		college: {
			code: toUpper(values.college?.code),
			name: toText(values.college?.name).trim(),
		},
		exam: {
			session: toText(values.exam?.session).trim(),
			year: toText(values.exam?.year).trim(),
			course: toText(values.exam?.course).trim(),
			branchCode: toUpper(values.exam?.branchCode),
		},
		subjects: (values.subjects || [])
			.map(sanitizeSubject)
			.filter((subject) =>
				Object.values(subject).some(
					(fieldValue) => fieldValue !== "" && fieldValue !== null
				)
			),
		summary: {
			sgpa: toNumberOrNull(values.summary?.sgpa),
			totalCredits: toNumberOrNull(values.summary?.totalCredits),
		},
		issue: {
			date: toText(values.issue?.date).trim(),
			serialNo: toUpper(values.issue?.serialNo),
		},
	};

	if (toText(values.institutionId).trim()) {
		payload.institutionId = toText(values.institutionId).trim();
	}

	return payload;
}

export function buildTrustedUploadFormData({ file, values }) {
	const formData = new FormData();
	formData.append("certificateData", JSON.stringify(normalizeCertificatePayload(values)));
	formData.append("certificate", file);
	return formData;
}

export function buildCandidateValidationFormData({ file, values }) {
	const formData = new FormData();
	formData.append("certificateData", JSON.stringify(normalizeCertificatePayload(values)));

	if (file) {
		formData.append("certificate", file);
	}

	return formData;
}

export function buildBulkUploadFormData(records) {
	const formData = new FormData();
	const normalizedRecords = records.map((record) =>
		normalizeCertificatePayload(record.values)
	);

	formData.append("records", JSON.stringify(normalizedRecords));
	records.forEach((record) => {
		formData.append("certificates", record.file);
	});

	return formData;
}

export function validateCertificateFile(file) {
	if (!file) {
		return "Please select a certificate file.";
	}

	if (file.size > MAX_CERTIFICATE_FILE_SIZE) {
		return "File too large. Maximum size is 10MB.";
	}

	const fileName = String(file.name || "").toLowerCase();
	const hasAllowedExtension = ALLOWED_CERTIFICATE_EXTENSIONS.some((extension) =>
		fileName.endsWith(extension)
	);
	const hasAllowedMimeType =
		!file.type || ALLOWED_CERTIFICATE_MIME_TYPES.includes(file.type.toLowerCase());

	if (!hasAllowedExtension || !hasAllowedMimeType) {
		return "Only PDF, JPG, JPEG, PNG, TIFF, and TIF files are allowed.";
	}

	return "";
}

export function validateBulkUploadRecords(records) {
	if (records.length === 0) {
		return "Add at least one certificate record before uploading.";
	}

	if (records.length > MAX_BULK_FILES) {
		return `Bulk upload supports up to ${MAX_BULK_FILES} files at a time.`;
	}

	const invalidFileRecord = records.find((record) => validateCertificateFile(record.file));
	if (invalidFileRecord) {
		return validateCertificateFile(invalidFileRecord.file);
	}

	return "";
}

export function normalizeCertificate(value) {
	if (!value) {
		return null;
	}

	const student = value.student || {};
	const college = value.college || {};
	const exam = value.exam || {};
	const summary = value.summary || {};
	const issue = value.issue || {};
	const institution = normalizeInstitutionSummary(value.institution || value.institutionId);

	return {
		id: value.id || value._id || "",
		certificateId: toUpper(value.certificateId),
		certificateHash: toText(value.certificateHash).trim(),
		student: {
			name: toText(student.name).trim(),
			seatNo: toUpper(student.seatNo),
			prn: toUpper(student.prn),
			motherName: toText(student.motherName).trim(),
		},
		college: {
			code: toUpper(college.code),
			name: toText(college.name).trim(),
		},
		exam: {
			session: toText(exam.session).trim(),
			year: toText(exam.year).trim(),
			course: toText(exam.course).trim(),
			branchCode: toUpper(exam.branchCode),
		},
		subjects: Array.isArray(value.subjects)
			? value.subjects.map((subject) => ({
					courseCode: toUpper(subject.courseCode),
					courseName: toText(subject.courseName).trim(),
					type: toText(subject.type).trim(),
					credits: subject.credits ?? null,
					grade: toUpper(subject.grade),
					creditPoints: subject.creditPoints ?? null,
			  }))
			: [],
		summary: {
			sgpa: summary.sgpa ?? null,
			totalCredits: summary.totalCredits ?? null,
		},
		issue: {
			date: value.issueDate || issue.date || "",
			dateInput: toDateInputValue(value.issueDate || issue.date),
			serialNo: toUpper(issue.serialNo || value.serialNo),
		},
		studentName: toText(value.studentName || student.name).trim(),
		rollNumber: toUpper(
			value.rollNumber || student.seatNo || student.prn
		),
		course: toText(value.course || exam.course).trim(),
		issueDate: value.issueDate || issue.date || "",
		institution,
		verificationStatus: toText(
			value.verificationStatus || value.status || "pending"
		).trim(),
		verificationResults: value.verificationResults || {},
		uploadedBy: value.uploadedBy || null,
		uploadedAt: value.uploadedAt || value.createdAt || "",
		originalFileName: toText(value.originalFileName).trim(),
	};
}

export function getStatusClasses(status) {
	switch (status) {
		case "verified":
			return "bg-emerald-100 text-emerald-700";
		case "suspicious":
			return "bg-amber-100 text-amber-700";
		case "fake":
			return "bg-rose-100 text-rose-700";
		default:
			return "bg-slate-100 text-slate-700";
	}
}
