import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
	AlertCircle,
	CheckCircle2,
	FileText,
	FileUp,
	Image as ImageIcon,
	Loader,
	UploadCloud,
	XCircle,
} from "lucide-react";
import { api } from "../lib/api";
import useAuth from "../hooks/useAuth";
import {
	addCertificateSubject,
	buildCertificateExtractionFormData,
	buildTrustedUploadFormData,
	createEmptyCertificateForm,
	removeCertificateSubject,
	setCertificateRootField,
	setCertificateSectionField,
	setCertificateSubjectField,
	validateCertificateFile,
} from "../lib/certificates";
import { canUploadTrustedCertificates } from "../lib/roles";
import { normalizeInstitutionSummary } from "../lib/normalizers";
import CertificateFormFields from "../components/CertificateFormFields";

function getErrorMessage(error, fallback) {
	const validationErrors = error?.response?.data?.errors;

	if (Array.isArray(validationErrors) && validationErrors.length > 0) {
		return validationErrors
			.map((item) => item.msg || item.message)
			.filter(Boolean)
			.join(" ");
	}

	return error?.response?.data?.message || error?.message || fallback;
}

function getUploadedCertificateId(result) {
	return result?.certificateId || result?.certificate?.certificateId || "";
}

function getUploadedCertificateStatus(result) {
	return result?.verificationStatus || result?.certificate?.status || "";
}

function getUploadedCertificateHash(result) {
	return result?.certificateHash || result?.certificate?.certificateHash || "";
}

function getUploadedBlockchainTxHash(result) {
	return result?.blockchainTxHash || result?.verificationResults?.blockchainTxHash || "";
}

function getCurrentMissingRequiredFields(values, { requireInstitution = false } = {}) {
	const firstSubject = values.subjects?.[0] || {};
	const checks = [
		["certificate ID", values.certificateId],
		["student name", values.student?.name],
		["seat number", values.student?.seatNo],
		["college code", values.college?.code],
		["college name", values.college?.name],
		["course", values.exam?.course],
		["exam session", values.exam?.session],
		["exam year", values.exam?.year],
		["issue date", values.issue?.date],
		["subject code", firstSubject.courseCode],
		["subject name", firstSubject.courseName],
	];

	if (requireInstitution) {
		checks.unshift(["institution", values.institutionId]);
	}

	return checks
		.filter(([, value]) => !String(value ?? "").trim())
		.map(([label]) => label);
}

export default function UploadPage() {
	const [institutions, setInstitutions] = useState([]);
	const [institutionsLoading, setInstitutionsLoading] = useState(false);
	const [institutionsError, setInstitutionsError] = useState("");
	const [values, setValues] = useState(createEmptyCertificateForm());
	const [file, setFile] = useState(null);
	const [previewUrl, setPreviewUrl] = useState("");
	const [isDragging, setIsDragging] = useState(false);
	const [isExtracting, setIsExtracting] = useState(false);
	const [extraction, setExtraction] = useState(null);
	const [extractionResponse, setExtractionResponse] = useState(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [result, setResult] = useState(null);
	const fileInputRef = useRef(null);
	const navigate = useNavigate();
	const { user } = useAuth();

	const isAdmin = user?.role === "admin";
	const uploadAllowed = canUploadTrustedCertificates(user?.role);
	const isInstitutionScoped = user?.role === "university_admin";
	const hasInstitutionScope = Boolean(user?.institution?.id || user?.institutionId);
	const needsInstitutionAssignment = !isAdmin && !hasInstitutionScope;
	const needsInstitutionVerification =
		isInstitutionScoped && hasInstitutionScope && user?.institution?.isVerified !== true;
	const isImageFile = Boolean(file?.type?.toLowerCase().startsWith("image/"));
	const backendMissingRequiredFields = extraction?.missingRequiredFields || [];
	const currentMissingRequiredFields = extraction
		? getCurrentMissingRequiredFields(values, { requireInstitution: isAdmin })
		: backendMissingRequiredFields;
	const missingRequiredFields =
		currentMissingRequiredFields.length > 0
			? currentMissingRequiredFields
			: backendMissingRequiredFields;
	const canRegister =
		Boolean(file && extraction) &&
		currentMissingRequiredFields.length === 0 &&
		!needsInstitutionAssignment &&
		!needsInstitutionVerification &&
		!isExtracting &&
		!isSubmitting;
	const extractionResponseClasses = {
		loading: "border-slate-200 bg-white text-slate-700",
		success: "border-emerald-200 bg-emerald-50 text-emerald-700",
		warning: "border-amber-200 bg-amber-50 text-amber-800",
		error: "border-rose-200 bg-rose-50 text-rose-700",
	};

	useEffect(() => {
		if (!isAdmin) {
			return undefined;
		}

		let isActive = true;

		async function fetchInstitutions() {
			setInstitutionsLoading(true);
			setInstitutionsError("");

			try {
				const response = await api.get("/institutions", {
					params: {
						page: 1,
						limit: 100,
						sortBy: "name",
						sortOrder: "asc",
					},
				});

				if (!isActive) {
					return;
				}

				setInstitutions(
					Array.isArray(response.data?.institutions)
						? response.data.institutions
								.map(normalizeInstitutionSummary)
								.filter(Boolean)
						: []
				);
			} catch (requestError) {
				if (isActive) {
					setInstitutionsError(
						getErrorMessage(
							requestError,
							"Unable to load institutions for admin upload."
						)
					);
				}
			} finally {
				if (isActive) {
					setInstitutionsLoading(false);
				}
			}
		}

		fetchInstitutions();

		return () => {
			isActive = false;
		};
	}, [isAdmin]);

	useEffect(() => {
		if (!file || !isImageFile) {
			setPreviewUrl("");
			return undefined;
		}

		const nextPreviewUrl = URL.createObjectURL(file);
		setPreviewUrl(nextPreviewUrl);

		return () => {
			URL.revokeObjectURL(nextPreviewUrl);
		};
	}, [file, isImageFile]);

	function updateRoot(field, nextValue) {
		setValues((current) => setCertificateRootField(current, field, nextValue));
	}

	function updateSection(section, field, nextValue) {
		setValues((current) =>
			setCertificateSectionField(current, section, field, nextValue)
		);
	}

	function updateSubject(index, field, nextValue) {
		setValues((current) =>
			setCertificateSubjectField(current, index, field, nextValue)
		);
	}

	function addSubject() {
		setValues((current) => addCertificateSubject(current));
	}

	function removeSubject(index) {
		setValues((current) => removeCertificateSubject(current, index));
	}

	function selectFile(nextFile) {
		setFile(nextFile || null);
		setResult(null);
		setExtraction(null);
		setExtractionResponse(null);
		setValues(createEmptyCertificateForm());

		if (!nextFile) {
			setError("");
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
			return;
		}

		setError(validateCertificateFile(nextFile));
	}

	function resetUpload() {
		setValues(createEmptyCertificateForm());
		setFile(null);
		setExtraction(null);
		setExtractionResponse(null);
		setError("");
		setResult(null);

		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}

	function handleDrag(event) {
		event.preventDefault();
		event.stopPropagation();
	}

	function handleDragEnter(event) {
		handleDrag(event);
		setIsDragging(true);
	}

	function handleDragLeave(event) {
		handleDrag(event);
		setIsDragging(false);
	}

	function handleDrop(event) {
		handleDrag(event);
		setIsDragging(false);
		selectFile(event.dataTransfer.files?.[0] || null);
	}

	async function extractDetails() {
		const fileError = validateCertificateFile(file);
		if (fileError) {
			setError(fileError);
			setExtractionResponse({
				type: "error",
				message: fileError,
			});
			return;
		}

		if (needsInstitutionAssignment) {
			const message =
				"Your account must be assigned to an institution before extracting certificate details.";
			setError(message);
			setExtractionResponse({
				type: "error",
				message,
			});
			return;
		}

		if (needsInstitutionVerification) {
			const message =
				"Your institution must be verified by the main admin before verifying certificates.";
			setError(message);
			setExtractionResponse({
				type: "error",
				message,
			});
			return;
		}

		setIsExtracting(true);
		setError("");
		setResult(null);
		setExtraction(null);
		setExtractionResponse({
			type: "loading",
			message: "AI extraction started. Reading the certificate file now...",
		});
		setValues(createEmptyCertificateForm());

		try {
			const response = await api.post(
				"/certificates/extract",
				buildCertificateExtractionFormData(file),
				{
					headers: {
						"Content-Type": "multipart/form-data",
					},
				}
			);

			if (response.data?.certificateData) {
				setValues(response.data.certificateData);
			}

			setExtraction(response.data?.extraction || {});

			if (response.data?.success === false) {
				const missingFields = response.data?.extraction?.missingRequiredFields || [];
				const message =
					response.data?.message ||
					(missingFields.length > 0
						? `AI extraction completed, but required fields are missing: ${missingFields.join(", ")}.`
						: "AI extraction completed, but required fields are missing.");
				setError(message);
				setExtractionResponse({
					type: "warning",
					message,
				});
			} else {
				setExtractionResponse({
					type: "success",
					message:
						response.data?.message ||
						"Certificate details extracted successfully.",
				});
			}
		} catch (requestError) {
			const message = getErrorMessage(
				requestError,
				"Unable to extract certificate details from this file."
			);
			setError(message);
			setExtractionResponse({
				type: "error",
				message,
			});
		} finally {
			setIsExtracting(false);
		}
	}

	async function submitUpload(event) {
		event.preventDefault();

		const fileError = validateCertificateFile(file);
		if (fileError) {
			setError(fileError);
			return;
		}

		if (!extraction) {
			setError("Extract certificate details before registration.");
			return;
		}

		if (currentMissingRequiredFields.length > 0) {
			setError(
				`Required fields are missing: ${currentMissingRequiredFields.join(", ")}.`
			);
			return;
		}

		if (needsInstitutionAssignment) {
			setError("Your account must be assigned to an institution before uploading certificates.");
			return;
		}

		if (needsInstitutionVerification) {
			setError("Your institution must be verified by the main admin before verifying certificates.");
			return;
		}

		setIsSubmitting(true);
		setError("");
		setResult(null);

		try {
			const response = await api.post(
				"/certificates/verify",
				buildTrustedUploadFormData({
					file,
					values,
				}),
				{
					headers: {
						"Content-Type": "multipart/form-data",
					},
				}
			);

			if (response.data?.success === false) {
				throw new Error(response.data?.message || "Certificate upload failed.");
			}

			setResult(response.data || {});
		} catch (requestError) {
			setError(
				getErrorMessage(
					requestError,
					"Unable to upload and register this certificate."
				)
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	function goToCertificates() {
		const certificateId = getUploadedCertificateId(result);
		navigate("/certificates", {
			state: {
				uploadSuccess: true,
				message:
					result?.message ||
					"Certificate uploaded and registered successfully.",
				certificateId,
				blockchainRecorded: Boolean(result?.blockchainRecorded),
				blockchainTxHash: getUploadedBlockchainTxHash(result),
			},
		});
	}

	if (!uploadAllowed) {
		return (
			<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<h1 className="text-2xl font-semibold text-slate-900">
					Upload Certificate
				</h1>
				<p className="mt-2 text-slate-500">
					Only authorized admin roles can upload certificate records.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
				<div>
					<h1 className="text-3xl font-bold text-slate-900">
						Upload Certificate
					</h1>
					<p className="text-slate-500">
						Upload a PDF or image certificate, then let AI extract the trusted record data.
					</p>
				</div>
				<Link
					to="/demo"
					className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
				>
					<FileText className="h-4 w-4" />
					OCR Demo
				</Link>
			</div>

			{institutionsError ? (
				<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
					{institutionsError}
				</div>
			) : null}

			{institutionsLoading ? (
				<div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
					Loading institutions...
				</div>
			) : null}

			{needsInstitutionAssignment ? (
				<div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
					<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
					<span>
						Your account needs an institution assignment before this upload can
						be registered.
					</span>
				</div>
			) : null}

			{needsInstitutionVerification ? (
				<div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
					<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
					<span>
						{user?.institution?.name || "Your university"} is waiting for main
						admin verification before certificate verification is enabled.
					</span>
				</div>
			) : null}

			<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<form onSubmit={submitUpload} className="space-y-6">
					<div
						className={`rounded-2xl border-2 border-dashed p-6 transition ${
							isDragging
								? "border-indigo-500 bg-indigo-50"
								: "border-slate-300 bg-slate-50"
						}`}
						onDragEnter={handleDragEnter}
						onDragLeave={handleDragLeave}
						onDragOver={handleDrag}
						onDrop={handleDrop}
					>
						{file ? (
							<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
								<div className="flex min-w-0 items-center gap-4">
									<div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
										{previewUrl ? (
											<img
												src={previewUrl}
												alt="Selected certificate preview"
												className="h-full w-full object-cover"
											/>
										) : (
											<FileText className="h-10 w-10 text-indigo-500" />
										)}
									</div>
									<div className="min-w-0">
										<p className="truncate font-semibold text-slate-900">
											{file.name}
										</p>
										<p className="text-sm text-slate-500">
											{(file.size / (1024 * 1024)).toFixed(2)} MB
										</p>
									</div>
								</div>
								<button
									type="button"
									onClick={() => selectFile(null)}
									className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
								>
									<XCircle className="h-4 w-4" />
									Remove
								</button>
							</div>
						) : (
							<label
								htmlFor="certificate-file"
								className="flex cursor-pointer flex-col items-center justify-center gap-3 py-8 text-center"
							>
								<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm">
									{isDragging ? (
										<FileUp className="h-8 w-8" />
									) : (
										<UploadCloud className="h-8 w-8" />
									)}
								</div>
								<div>
									<p className="text-lg font-semibold text-slate-900">
										Drop a PDF or image certificate here
									</p>
									<p className="mt-1 text-sm text-slate-500">
										PDF, JPG, JPEG, PNG, TIFF, or TIF up to 10MB.
									</p>
								</div>
							</label>
						)}
						<input
							ref={fileInputRef}
							id="certificate-file"
							type="file"
							accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,image/*,application/pdf"
							className="sr-only"
							onChange={(event) => selectFile(event.target.files?.[0] || null)}
						/>
					</div>

					<div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h2 className="text-base font-semibold text-slate-900">
								AI extraction
							</h2>
							<p className="text-sm text-slate-500">
								Extracted details are read-only and come from the uploaded file.
							</p>
						</div>
						<button
							type="button"
							onClick={extractDetails}
							disabled={!file || isExtracting || isSubmitting}
							className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{isExtracting ? (
								<Loader className="h-4 w-4 animate-spin" />
							) : (
								<FileText className="h-4 w-4" />
							)}
							{isExtracting ? "Extracting..." : "Extract Details"}
						</button>
					</div>

					{extractionResponse ? (
						<div
							className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${
								extractionResponseClasses[extractionResponse.type] ||
								extractionResponseClasses.loading
							}`}
						>
							{extractionResponse.type === "loading" ? (
								<Loader className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
							) : extractionResponse.type === "success" ? (
								<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
							) : (
								<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
							)}
							<span>{extractionResponse.message}</span>
						</div>
					) : null}

					{extraction ? (
						<div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
							<div className="font-semibold">
								OCR confidence: {Math.round(extraction.confidence || 0)}%
							</div>
							{missingRequiredFields.length > 0 ? (
								<p className="mt-1">
									Missing required fields: {missingRequiredFields.join(", ")}.
								</p>
							) : (
								<p className="mt-1">
									All required registration fields were generated.
								</p>
							)}
							{Array.isArray(extraction.warnings) &&
							extraction.warnings.length > 0 ? (
								<ul className="mt-2 list-disc space-y-1 pl-5">
									{extraction.warnings.map((warning) => (
										<li key={warning}>{warning}</li>
									))}
								</ul>
							) : null}
						</div>
					) : null}

					<CertificateFormFields
						title="AI Extracted Details"
						description="Review the extracted fields before registration."
						values={values}
						institutions={institutions}
						showInstitutionField={isAdmin}
						disabled={isSubmitting}
						onRootChange={updateRoot}
						onSectionChange={updateSection}
						onSubjectChange={updateSubject}
						onAddSubject={addSubject}
						onRemoveSubject={removeSubject}
					/>

					{error ? (
						<div className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
							<AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
							<span>{error}</span>
						</div>
					) : null}

					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<button
							type="submit"
							disabled={!canRegister}
							className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{isSubmitting ? (
								<Loader className="h-4 w-4 animate-spin" />
							) : (
								<FileUp className="h-4 w-4" />
							)}
							{isSubmitting ? "Uploading..." : "Upload and Register"}
						</button>
						<button
							type="button"
							onClick={resetUpload}
							disabled={isSubmitting}
							className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
						>
							<XCircle className="h-4 w-4" />
							Clear
						</button>
					</div>
				</form>

				{result ? (
					<div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
						<div className="flex items-center gap-2 text-emerald-700">
							<CheckCircle2 className="h-5 w-5" />
							<span className="font-semibold">
								{result.message ||
									"Certificate uploaded and registered successfully."}
							</span>
						</div>
						<div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
							<div className="rounded-lg bg-white/80 p-3">
								<p className="text-slate-500">Certificate ID</p>
								<p className="mt-1 break-words font-semibold text-slate-900">
									{getUploadedCertificateId(result) || "--"}
								</p>
							</div>
							<div className="rounded-lg bg-white/80 p-3">
								<p className="text-slate-500">Status</p>
								<p className="mt-1 font-semibold text-slate-900 capitalize">
									{getUploadedCertificateStatus(result) || "--"}
								</p>
							</div>
							<div className="rounded-lg bg-white/80 p-3">
								<p className="text-slate-500">Hash</p>
								<p className="mt-1 break-words font-semibold text-slate-900 text-xs">
									{getUploadedCertificateHash(result) || "--"}
								</p>
							</div>
							<div className="rounded-lg bg-white/80 p-3">
								<p className="text-slate-500">Blockchain TX</p>
								{getUploadedBlockchainTxHash(result) ? (
									<p className="mt-1 break-words font-semibold text-emerald-700 text-xs">
										{getUploadedBlockchainTxHash(result)}
									</p>
								) : (
									<span className="mt-1 inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
										Not recorded
									</span>
								)}
							</div>
						</div>
						<div className="mt-4 flex flex-col gap-3 sm:flex-row">
							<button
								type="button"
								onClick={goToCertificates}
								className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
							>
								<ImageIcon className="h-4 w-4" />
								View Certificates
							</button>
							<button
								type="button"
								onClick={resetUpload}
								className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
							>
								<UploadCloud className="h-4 w-4" />
								Upload Another
							</button>
						</div>
					</div>
				) : null}
			</section>
		</div>
	);
}
