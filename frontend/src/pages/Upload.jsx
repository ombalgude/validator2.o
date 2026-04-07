import React, { useEffect, useState } from "react";
import {
	AlertTriangle,
	CheckCircle2,
	FileUp,
	Loader,
	Plus,
	Trash2,
	UploadCloud,
} from "lucide-react";
import { api } from "../lib/api";
import useAuth from "../hooks/useAuth";
import {
	addCertificateSubject,
	buildBulkUploadFormData,
	buildTrustedUploadFormData,
	createEmptyCertificateForm,
	removeCertificateSubject,
	setCertificateRootField,
	setCertificateSectionField,
	setCertificateSubjectField,
	validateBulkUploadRecords,
	validateCertificateFile,
} from "../lib/certificates";
import { canUploadTrustedCertificates } from "../lib/roles";
import { normalizeInstitutionSummary } from "../lib/normalizers";
import CertificateFormFields from "../components/CertificateFormFields";

function getErrorMessage(error, fallback) {
	return error?.response?.data?.message || error?.message || fallback;
}

function createBulkRecord() {
	return {
		id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		values: createEmptyCertificateForm(),
		file: null,
	};
}

export default function UploadPage() {
	const [tab, setTab] = useState("single");
	const [institutions, setInstitutions] = useState([]);
	const [institutionsLoading, setInstitutionsLoading] = useState(false);
	const [institutionsError, setInstitutionsError] = useState("");
	const [singleValues, setSingleValues] = useState(createEmptyCertificateForm());
	const [singleFile, setSingleFile] = useState(null);
	const [singleLoading, setSingleLoading] = useState(false);
	const [singleError, setSingleError] = useState("");
	const [singleResult, setSingleResult] = useState(null);
	const [bulkRecords, setBulkRecords] = useState([createBulkRecord()]);
	const [bulkLoading, setBulkLoading] = useState(false);
	const [bulkError, setBulkError] = useState("");
	const [bulkResult, setBulkResult] = useState(null);
	const { user } = useAuth();

	const isAdmin = user?.role === "admin";
	const uploadAllowed = canUploadTrustedCertificates(user?.role);

	useEffect(() => {
		if (!isAdmin) {
			return;
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

	function updateSingleRoot(field, value) {
		setSingleValues((current) => setCertificateRootField(current, field, value));
	}

	function updateSingleSection(section, field, value) {
		setSingleValues((current) =>
			setCertificateSectionField(current, section, field, value)
		);
	}

	function updateSingleSubject(index, field, value) {
		setSingleValues((current) =>
			setCertificateSubjectField(current, index, field, value)
		);
	}

	function addSingleSubject() {
		setSingleValues((current) => addCertificateSubject(current));
	}

	function removeSingleSubject(index) {
		setSingleValues((current) => removeCertificateSubject(current, index));
	}

	function updateBulkRecord(recordId, updater) {
		setBulkRecords((current) =>
			current.map((record) =>
				record.id === recordId ? updater(record) : record
			)
		);
	}

	function updateBulkRoot(recordId, field, value) {
		updateBulkRecord(recordId, (record) => ({
			...record,
			values: setCertificateRootField(record.values, field, value),
		}));
	}

	function updateBulkSection(recordId, section, field, value) {
		updateBulkRecord(recordId, (record) => ({
			...record,
			values: setCertificateSectionField(record.values, section, field, value),
		}));
	}

	function updateBulkSubject(recordId, index, field, value) {
		updateBulkRecord(recordId, (record) => ({
			...record,
			values: setCertificateSubjectField(record.values, index, field, value),
		}));
	}

	function addBulkSubject(recordId) {
		updateBulkRecord(recordId, (record) => ({
			...record,
			values: addCertificateSubject(record.values),
		}));
	}

	function removeBulkSubject(recordId, index) {
		updateBulkRecord(recordId, (record) => ({
			...record,
			values: removeCertificateSubject(record.values, index),
		}));
	}

	async function submitSingleUpload(event) {
		event.preventDefault();
		setSingleLoading(true);
		setSingleError("");
		setSingleResult(null);

		const fileError = validateCertificateFile(singleFile);
		if (fileError) {
			setSingleError(fileError);
			setSingleLoading(false);
			return;
		}

		try {
			const response = await api.post(
				"/certificates/verify",
				buildTrustedUploadFormData({
					file: singleFile,
					values: singleValues,
				}),
				{
					headers: {
						"Content-Type": "multipart/form-data",
					},
				}
			);

			setSingleResult(response.data);
		} catch (requestError) {
			setSingleError(
				getErrorMessage(requestError, "Unable to upload trusted certificate.")
			);
		} finally {
			setSingleLoading(false);
		}
	}

	async function submitBulkUpload(event) {
		event.preventDefault();
		setBulkLoading(true);
		setBulkError("");
		setBulkResult(null);

		const validationMessage = validateBulkUploadRecords(bulkRecords);
		if (validationMessage) {
			setBulkError(validationMessage);
			setBulkLoading(false);
			return;
		}

		try {
			const response = await api.post(
				"/certificates/bulk",
				buildBulkUploadFormData(bulkRecords),
				{
					headers: {
						"Content-Type": "multipart/form-data",
					},
				}
			);

			setBulkResult(response.data);
		} catch (requestError) {
			setBulkError(
				getErrorMessage(requestError, "Unable to complete bulk trusted upload.")
			);
		} finally {
			setBulkLoading(false);
		}
	}

	if (!uploadAllowed) {
		return (
			<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<h1 className="text-2xl font-semibold text-slate-900">
					Trusted Uploads
				</h1>
				<p className="mt-2 text-slate-500">
					Only admins, institution admins, and university admins can upload
					trusted certificate records.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-sm">
				<div className="flex items-start gap-3">
					<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
					<div>
						<h1 className="text-xl font-semibold">Trusted Certificate Uploads</h1>
						<p className="mt-1 text-sm">
							The backend route is named `/certificates/verify`, but in this UI it
							is treated as a trusted record upload. Newly created records are
							stored with a `pending` status and do not run the candidate
							validation flow.
						</p>
					</div>
				</div>
			</div>

			<div className="flex flex-wrap gap-2">
				<button
					type="button"
					onClick={() => setTab("single")}
					className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
						tab === "single"
							? "border-indigo-600 bg-indigo-600 text-white"
							: "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
					}`}
				>
					Single Upload
				</button>
				<button
					type="button"
					onClick={() => setTab("bulk")}
					className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
						tab === "bulk"
							? "border-indigo-600 bg-indigo-600 text-white"
							: "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
					}`}
				>
					Bulk Upload
				</button>
			</div>

			{institutionsError ? (
				<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
					{institutionsError}
				</div>
			) : null}
			{isAdmin && institutionsLoading ? (
				<div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
					Loading institutions for admin selection...
				</div>
			) : null}
			{!isAdmin ? (
				<div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
					Your institution is derived from the authenticated token, so no
					institution selector is required here.
				</div>
			) : null}

			{tab === "single" ? (
				<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
					<div className="mb-6 flex items-center gap-3">
						<UploadCloud className="h-5 w-5 text-slate-400" />
						<div>
							<h2 className="text-xl font-semibold text-slate-900">
								Single Trusted Upload
							</h2>
							<p className="text-sm text-slate-500">
								Create one trusted certificate record with `POST /certificates/verify`.
							</p>
						</div>
					</div>

					<form onSubmit={submitSingleUpload} className="space-y-6">
						<CertificateFormFields
							title="Trusted Certificate Metadata"
							values={singleValues}
							institutions={institutions}
							showInstitutionField={isAdmin}
							onRootChange={updateSingleRoot}
							onSectionChange={updateSingleSection}
							onSubjectChange={updateSingleSubject}
							onAddSubject={addSingleSubject}
							onRemoveSubject={removeSingleSubject}
						/>

						<div className="space-y-2">
							<label className="block text-sm font-medium text-slate-700">
								Certificate file
							</label>
							<input
								type="file"
								accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif"
								onChange={(event) => setSingleFile(event.target.files?.[0] || null)}
								className="w-full rounded-lg border border-slate-300 px-3 py-2"
							/>
							<p className="text-xs text-slate-500">
								Allowed types: PDF, JPG, JPEG, PNG, TIFF, TIF. Maximum file size:
								10MB.
							</p>
						</div>

						{singleError ? (
							<div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
								{singleError}
							</div>
						) : null}

						<button
							type="submit"
							disabled={singleLoading}
							className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{singleLoading ? (
								<Loader className="h-4 w-4 animate-spin" />
							) : (
								<FileUp className="h-4 w-4" />
							)}
							Upload trusted certificate
						</button>
					</form>

					{singleResult ? (
						<div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
							<div className="flex items-center gap-2 text-emerald-700">
								<CheckCircle2 className="h-5 w-5" />
								<span className="font-semibold">
									{singleResult.message || "Trusted certificate uploaded successfully."}
								</span>
							</div>
							<pre className="mt-3 overflow-x-auto rounded-lg bg-emerald-950 p-3 text-xs text-emerald-50">
								{JSON.stringify(singleResult, null, 2)}
							</pre>
						</div>
					) : null}
				</section>
			) : (
				<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
					<div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<div>
							<h2 className="text-xl font-semibold text-slate-900">
								Bulk Trusted Upload
							</h2>
							<p className="text-sm text-slate-500">
								Send one `records` JSON array and matching `certificates` files in
								order to `POST /certificates/bulk`.
							</p>
						</div>
						<button
							type="button"
							onClick={() =>
								setBulkRecords((current) => [...current, createBulkRecord()])
							}
							className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
						>
							<Plus className="h-4 w-4" />
							Add record
						</button>
					</div>

					<form onSubmit={submitBulkUpload} className="space-y-6">
						<div className="space-y-6">
							{bulkRecords.map((record, index) => (
								<div
									key={record.id}
									className="rounded-2xl border border-slate-200 p-5"
								>
									<div className="mb-4 flex items-center justify-between gap-3">
										<div>
											<h3 className="text-lg font-semibold text-slate-900">
												Record {index + 1}
											</h3>
											<p className="text-sm text-slate-500">
												Keep the metadata and file in the same card so bulk order
												stays 1:1.
											</p>
										</div>
										{bulkRecords.length > 1 ? (
											<button
												type="button"
												onClick={() =>
													setBulkRecords((current) =>
														current.filter((item) => item.id !== record.id)
													)
												}
												className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
											>
												<Trash2 className="h-4 w-4" />
												Remove
											</button>
										) : null}
									</div>

									<CertificateFormFields
										values={record.values}
										institutions={institutions}
										showInstitutionField={isAdmin}
										onRootChange={(field, value) =>
											updateBulkRoot(record.id, field, value)
										}
										onSectionChange={(section, field, value) =>
											updateBulkSection(record.id, section, field, value)
										}
										onSubjectChange={(subjectIndex, field, value) =>
											updateBulkSubject(record.id, subjectIndex, field, value)
										}
										onAddSubject={() => addBulkSubject(record.id)}
										onRemoveSubject={(subjectIndex) =>
											removeBulkSubject(record.id, subjectIndex)
										}
									/>

									<div className="mt-6 space-y-2">
										<label className="block text-sm font-medium text-slate-700">
											Certificate file for record {index + 1}
										</label>
										<input
											type="file"
											accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif"
											onChange={(event) =>
												updateBulkRecord(record.id, (currentRecord) => ({
													...currentRecord,
													file: event.target.files?.[0] || null,
												}))
											}
											className="w-full rounded-lg border border-slate-300 px-3 py-2"
										/>
									</div>
								</div>
							))}
						</div>

						{bulkError ? (
							<div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
								{bulkError}
							</div>
						) : null}

						<button
							type="submit"
							disabled={bulkLoading}
							className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{bulkLoading ? (
								<Loader className="h-4 w-4 animate-spin" />
							) : (
								<UploadCloud className="h-4 w-4" />
							)}
							Upload bulk trusted records
						</button>
					</form>

					{bulkResult ? (
						<div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
							<div className="flex items-center gap-2 text-emerald-700">
								<CheckCircle2 className="h-5 w-5" />
								<span className="font-semibold">
									{bulkResult.message || "Bulk upload completed."}
								</span>
							</div>
							<pre className="mt-3 overflow-x-auto rounded-lg bg-emerald-950 p-3 text-xs text-emerald-50">
								{JSON.stringify(bulkResult, null, 2)}
							</pre>
						</div>
					) : null}
				</section>
			)}
		</div>
	);
}
