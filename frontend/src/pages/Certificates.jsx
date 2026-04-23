import React, { useEffect, useState } from 'react';
import {
	AlertTriangle,
	CheckCircle2,
	FileSearch,
	Loader,
	RefreshCw,
	Search,
	ShieldCheck,
} from 'lucide-react';
import { api } from '../lib/api';
import useAuth from '../hooks/useAuth';
import {
	CERTIFICATE_STATUSES,
	addCertificateSubject,
	buildCandidateValidationFormData,
	createEmptyCertificateForm,
	getStatusClasses,
	normalizeCertificate,
	removeCertificateSubject,
	setCertificateRootField,
	setCertificateSectionField,
	setCertificateSubjectField,
	validateCertificateFile,
} from '../lib/certificates';
import {
	canManuallyUpdateCertificate,
	canValidateCandidate,
	formatRoleLabel,
} from '../lib/roles';
import CertificateFormFields from '../components/CertificateFormFields';

const DEFAULT_FILTERS = {
	status: '',
	studentName: '',
	rollNumber: '',
	certificateId: '',
	certificateHash: '',
	institutionId: '',
	dateFrom: '',
	dateTo: '',
	sortBy: 'createdAt',
	sortOrder: 'desc',
	limit: 10,
	page: 1,
};

function getErrorMessage(error, fallback) {
	return error?.response?.data?.message || error?.message || fallback;
}

function formatDateTime(value) {
	if (!value) {
		return '--';
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return '--';
	}

	return date.toLocaleString();
}

export default function CertificatesPage() {
	const [filters, setFilters] = useState(DEFAULT_FILTERS);
	const [query, setQuery] = useState(DEFAULT_FILTERS);
	const [certificates, setCertificates] = useState([]);
	const [pagination, setPagination] = useState({
		total: 0,
		currentPage: 1,
		totalPages: 1,
	});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [detailLoading, setDetailLoading] = useState(false);
	const [detailError, setDetailError] = useState('');
	const [selectedCertificate, setSelectedCertificate] = useState(null);
	const [validationValues, setValidationValues] = useState(
		createEmptyCertificateForm(),
	);
	const [validationFile, setValidationFile] = useState(null);
	const [validationLoading, setValidationLoading] = useState(false);
	const [validationError, setValidationError] = useState('');
	const [validationResult, setValidationResult] = useState(null);
	const [manualForm, setManualForm] = useState({
		status: 'verified',
		reason: '',
		verificationMethod: 'manual_review',
		verificationResults: '',
	});
	const [manualLoading, setManualLoading] = useState(false);
	const [manualError, setManualError] = useState('');
	const [manualSuccess, setManualSuccess] = useState('');
	const [socketNotice, setSocketNotice] = useState('');
	const { user, lastStatusUpdate } = useAuth();

	const validationAllowed = canValidateCandidate(user?.role);
	const manualUpdateAllowed = canManuallyUpdateCertificate(user?.role);

	async function fetchCertificates(nextQuery = query) {
		setLoading(true);
		setError('');

		try {
			const response = await api.get('/certificates', {
				params: nextQuery,
			});

			setCertificates(
				Array.isArray(response.data?.certificates)
					? response.data.certificates.map(normalizeCertificate).filter(Boolean)
					: [],
			);
			setPagination({
				total: response.data?.total || 0,
				currentPage: response.data?.currentPage || nextQuery.page,
				totalPages: response.data?.totalPages || 1,
			});
		} catch (requestError) {
			setError(getErrorMessage(requestError, 'Unable to load certificates.'));
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		fetchCertificates(query);
	}, [query]);

	useEffect(() => {
		if (!selectedCertificate?.id) {
			setManualForm((current) => ({
				...current,
				status: 'verified',
			}));
			return;
		}

		setManualForm((current) => ({
			...current,
			status: selectedCertificate.verificationStatus || 'verified',
		}));
	}, [selectedCertificate?.id, selectedCertificate?.verificationStatus]);

	useEffect(() => {
		if (!lastStatusUpdate?.certificateId) {
			return;
		}

		setSocketNotice(
			lastStatusUpdate.message ||
				`Certificate ${lastStatusUpdate.certificateId} was updated to ${lastStatusUpdate.newStatus}.`,
		);

		setCertificates((current) =>
			current.map((certificate) =>
				certificate.certificateId === lastStatusUpdate.certificateId
					? {
							...certificate,
							verificationStatus:
								lastStatusUpdate.newStatus || certificate.verificationStatus,
						}
					: certificate,
			),
		);

		setSelectedCertificate((current) =>
			current && current.certificateId === lastStatusUpdate.certificateId
				? {
						...current,
						verificationStatus:
							lastStatusUpdate.newStatus || current.verificationStatus,
					}
				: current,
		);
	}, [lastStatusUpdate]);

	async function loadCertificateDetails(identifier) {
		setDetailLoading(true);
		setDetailError('');

		try {
			const response = await api.get(`/certificates/${identifier}`);
			setSelectedCertificate(normalizeCertificate(response.data));
			setManualError('');
			setManualSuccess('');
		} catch (requestError) {
			setDetailError(
				getErrorMessage(requestError, 'Unable to load certificate details.'),
			);
		} finally {
			setDetailLoading(false);
		}
	}

	function handleFilterChange(field, value) {
		setFilters((current) => ({
			...current,
			[field]: value,
		}));
	}

	function applyFilters(event) {
		event.preventDefault();
		setQuery({
			...filters,
			page: 1,
		});
	}

	function resetFilters() {
		setFilters(DEFAULT_FILTERS);
		setQuery(DEFAULT_FILTERS);
	}

	function changePage(nextPage) {
		setQuery((current) => ({
			...current,
			page: nextPage,
		}));
	}

	function updateValidationRoot(field, value) {
		setValidationValues((current) =>
			setCertificateRootField(current, field, value),
		);
	}

	function updateValidationSection(section, field, value) {
		setValidationValues((current) =>
			setCertificateSectionField(current, section, field, value),
		);
	}

	function updateValidationSubject(index, field, value) {
		setValidationValues((current) =>
			setCertificateSubjectField(current, index, field, value),
		);
	}

	function addValidationSubject() {
		setValidationValues((current) => addCertificateSubject(current));
	}

	function removeValidationSubject(index) {
		setValidationValues((current) => removeCertificateSubject(current, index));
	}

	async function submitValidation(event) {
		event.preventDefault();
		setValidationLoading(true);
		setValidationError('');
		setValidationResult(null);

		const fileError = validationFile
			? validateCertificateFile(validationFile)
			: '';
		if (fileError) {
			setValidationError(fileError);
			setValidationLoading(false);
			return;
		}

		try {
			const response = await api.post(
				'/certificates/validate',
				buildCandidateValidationFormData({
					file: validationFile,
					values: validationValues,
				}),
				{
					headers: {
						'Content-Type': 'multipart/form-data',
					},
				},
			);

			setValidationResult({
				...response.data,
				trustedCertificate: normalizeCertificate(
					response.data?.trustedCertificate,
				),
			});
		} catch (requestError) {
			setValidationError(
				getErrorMessage(
					requestError,
					'Unable to validate the candidate certificate.',
				),
			);
		} finally {
			setValidationLoading(false);
		}
	}

	async function submitManualReview(event) {
		event.preventDefault();
		if (!selectedCertificate?.id) {
			return;
		}

		setManualLoading(true);
		setManualError('');
		setManualSuccess('');

		let parsedVerificationResults;
		if (manualForm.verificationResults.trim()) {
			try {
				parsedVerificationResults = JSON.parse(manualForm.verificationResults);
			} catch (_error) {
				setManualError('Verification results must be valid JSON.');
				setManualLoading(false);
				return;
			}
		}

		try {
			const response = await api.put(
				`/certificates/${selectedCertificate.id}/verify`,
				{
					status: manualForm.status,
					reason: manualForm.reason.trim(),
					verificationMethod: manualForm.verificationMethod,
					verificationResults: parsedVerificationResults,
				},
			);

			const normalized = normalizeCertificate(response.data?.certificate);
			setSelectedCertificate(normalized);
			setCertificates((current) =>
				current.map((certificate) =>
					certificate.id === normalized.id ? normalized : certificate,
				),
			);
			setManualSuccess(
				response.data?.message || 'Certificate updated successfully.',
			);
		} catch (requestError) {
			setManualError(
				getErrorMessage(requestError, 'Unable to update certificate status.'),
			);
		} finally {
			setManualLoading(false);
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
				<div>
					<h1 className="text-3xl font-bold text-slate-900">Certificates</h1>
					<p className="text-slate-500">
						Browse trusted records, validate candidate documents, and review
						live status updates for your {formatRoleLabel(user?.role || 'user')}{' '}
						access.
					</p>
				</div>
				<button
					type="button"
					onClick={() => fetchCertificates(query)}
					className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
				>
					<RefreshCw className="h-4 w-4" />
					Refresh
				</button>
			</div>

			{socketNotice ? (
				<div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
					{socketNotice}
				</div>
			) : null}

			<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<div className="mb-4 flex items-center gap-3">
					<Search className="h-5 w-5 text-slate-400" />
					<div>
						<h2 className="text-xl font-semibold text-slate-900">
							Search and Filter
						</h2>
						<p className="text-sm text-slate-500">
							Query `/certificates` with backend-supported filters and sorting.
						</p>
					</div>
				</div>
				<form
					onSubmit={applyFilters}
					className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
				>
					<input
						className="rounded-lg border border-slate-300 px-3 py-2"
						placeholder="Student name"
						value={filters.studentName}
						onChange={(event) =>
							handleFilterChange('studentName', event.target.value)
						}
					/>
					<input
						className="rounded-lg border border-slate-300 px-3 py-2"
						placeholder="Roll number"
						value={filters.rollNumber}
						onChange={(event) =>
							handleFilterChange('rollNumber', event.target.value)
						}
					/>
					<input
						className="rounded-lg border border-slate-300 px-3 py-2"
						placeholder="Certificate ID"
						value={filters.certificateId}
						onChange={(event) =>
							handleFilterChange('certificateId', event.target.value)
						}
					/>
					<input
						className="rounded-lg border border-slate-300 px-3 py-2"
						placeholder="Certificate hash"
						value={filters.certificateHash}
						onChange={(event) =>
							handleFilterChange('certificateHash', event.target.value)
						}
					/>
					<input
						className="rounded-lg border border-slate-300 px-3 py-2"
						placeholder="Institution ID"
						value={filters.institutionId}
						onChange={(event) =>
							handleFilterChange('institutionId', event.target.value)
						}
					/>
					<select
						className="rounded-lg border border-slate-300 px-3 py-2"
						value={filters.status}
						onChange={(event) =>
							handleFilterChange('status', event.target.value)
						}
					>
						<option value="">All statuses</option>
						{CERTIFICATE_STATUSES.map((status) => (
							<option key={status} value={status}>
								{status}
							</option>
						))}
					</select>
					<select
						className="rounded-lg border border-slate-300 px-3 py-2"
						value={filters.sortBy}
						onChange={(event) =>
							handleFilterChange('sortBy', event.target.value)
						}
					>
						<option value="createdAt">Created at</option>
						<option value="uploadedAt">Uploaded at</option>
						<option value="issueDate">Issue date</option>
						<option value="studentName">Student name</option>
						<option value="certificateId">Certificate ID</option>
					</select>
					<select
						className="rounded-lg border border-slate-300 px-3 py-2"
						value={filters.sortOrder}
						onChange={(event) =>
							handleFilterChange('sortOrder', event.target.value)
						}
					>
						<option value="desc">Descending</option>
						<option value="asc">Ascending</option>
					</select>
					<input
						type="date"
						className="rounded-lg border border-slate-300 px-3 py-2"
						value={filters.dateFrom}
						onChange={(event) =>
							handleFilterChange('dateFrom', event.target.value)
						}
					/>
					<input
						type="date"
						className="rounded-lg border border-slate-300 px-3 py-2"
						value={filters.dateTo}
						onChange={(event) =>
							handleFilterChange('dateTo', event.target.value)
						}
					/>
					<select
						className="rounded-lg border border-slate-300 px-3 py-2"
						value={filters.limit}
						onChange={(event) =>
							handleFilterChange('limit', Number(event.target.value))
						}
					>
						<option value={10}>10 per page</option>
						<option value={25}>25 per page</option>
						<option value={50}>50 per page</option>
					</select>
					<div className="flex gap-3 xl:col-span-1">
						<button
							type="submit"
							className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
						>
							Apply
						</button>
						<button
							type="button"
							onClick={resetFilters}
							className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
						>
							Reset
						</button>
					</div>
				</form>
			</section>

			<div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
				<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
					<div className="mb-4 flex items-center justify-between gap-3">
						<div>
							<h2 className="text-xl font-semibold text-slate-900">
								Certificate List
							</h2>
							<p className="text-sm text-slate-500">
								{pagination.total} records returned across{' '}
								{pagination.totalPages} pages.
							</p>
						</div>
						<FileSearch className="h-5 w-5 text-slate-400" />
					</div>

					{error ? (
						<div className="mb-4 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
							<AlertTriangle className="h-5 w-5" />
							<span>{error}</span>
						</div>
					) : null}

					{loading ? (
						<div className="flex min-h-[240px] items-center justify-center">
							<div className="flex items-center gap-3 text-slate-500">
								<Loader className="h-5 w-5 animate-spin" />
								<span>Loading certificates...</span>
							</div>
						</div>
					) : (
						<>
							<div className="overflow-x-auto">
								<table className="min-w-full text-left text-sm">
									<thead className="border-b border-slate-200 text-slate-500">
										<tr>
											<th className="pb-3 pr-4 font-medium">Certificate</th>
											<th className="pb-3 pr-4 font-medium">Student</th>
											<th className="pb-3 pr-4 font-medium">Institution</th>
											<th className="pb-3 pr-4 font-medium">Status</th>
											<th className="pb-3 font-medium">Uploaded</th>
										</tr>
									</thead>
									<tbody>
										{certificates.length === 0 ? (
											<tr>
												<td className="py-6 text-slate-500" colSpan={5}>
													No certificates matched these filters.
												</td>
											</tr>
										) : (
											certificates.map((certificate) => (
												<tr
													key={certificate.id}
													className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
													onClick={() =>
														loadCertificateDetails(
															certificate.id || certificate.certificateId,
														)
													}
												>
													<td className="py-3 pr-4 font-medium text-slate-800">
														{certificate.certificateId}
													</td>
													<td className="py-3 pr-4 text-slate-600">
														<div>{certificate.studentName || '--'}</div>
														<div className="text-xs text-slate-400">
															{certificate.rollNumber || '--'}
														</div>
													</td>
													<td className="py-3 pr-4 text-slate-600">
														{certificate.institution?.name || '--'}
													</td>
													<td className="py-3 pr-4">
														<span
															className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClasses(
																certificate.verificationStatus,
															)}`}
														>
															{certificate.verificationStatus}
														</span>
													</td>
													<td className="py-3 text-slate-500">
														{formatDateTime(certificate.uploadedAt)}
													</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>

							<div className="mt-4 flex items-center justify-between gap-4">
								<p className="text-sm text-slate-500">
									Page {pagination.currentPage} of {pagination.totalPages}
								</p>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={() =>
											changePage(Math.max(1, pagination.currentPage - 1))
										}
										disabled={pagination.currentPage <= 1}
										className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
									>
										Previous
									</button>
									<button
										type="button"
										onClick={() =>
											changePage(
												Math.min(
													pagination.totalPages,
													pagination.currentPage + 1,
												),
											)
										}
										disabled={pagination.currentPage >= pagination.totalPages}
										className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
									>
										Next
									</button>
								</div>
							</div>
						</>
					)}
				</section>

				<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
					<div className="mb-4 flex items-center justify-between gap-3">
						<div>
							<h2 className="text-xl font-semibold text-slate-900">
								Certificate Details
							</h2>
							<p className="text-sm text-slate-500">
								Select a row to query `/certificates/:id`.
							</p>
						</div>
						<ShieldCheck className="h-5 w-5 text-slate-400" />
					</div>

					{detailError ? (
						<div className="mb-4 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
							<AlertTriangle className="h-5 w-5" />
							<span>{detailError}</span>
						</div>
					) : null}

					{detailLoading ? (
						<div className="flex min-h-[240px] items-center justify-center text-slate-500">
							<Loader className="mr-3 h-5 w-5 animate-spin" />
							Loading certificate details...
						</div>
					) : selectedCertificate ? (
						<div className="space-y-4">
							<div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="text-lg font-semibold text-slate-900">
											{selectedCertificate.certificateId}
										</p>
										<p className="text-sm text-slate-500">
											{selectedCertificate.studentName} |{' '}
											{selectedCertificate.course}
										</p>
									</div>
									<span
										className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClasses(
											selectedCertificate.verificationStatus,
										)}`}
									>
										{selectedCertificate.verificationStatus}
									</span>
								</div>
							</div>

							<div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
								<div className="rounded-xl border border-slate-200 p-4">
									<p className="font-semibold text-slate-900">Student</p>
									<p className="mt-2 text-slate-600">
										{selectedCertificate.studentName || '--'}
									</p>
									<p className="text-slate-500">
										Roll: {selectedCertificate.rollNumber || '--'}
									</p>
								</div>
								<div className="rounded-xl border border-slate-200 p-4">
									<p className="font-semibold text-slate-900">Institution</p>
									<p className="mt-2 text-slate-600">
										{selectedCertificate.institution?.name || '--'}
									</p>
									<p className="text-slate-500">
										{selectedCertificate.institution?.code || '--'}
									</p>
								</div>
								<div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
									<p className="font-semibold text-slate-900">Hashes</p>
									<p className="mt-2 break-all text-slate-600">
										{selectedCertificate.certificateHash || '--'}
									</p>
								</div>
								<div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
									<p className="font-semibold text-slate-900">
										Verification Results
									</p>
									<pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
										{JSON.stringify(
											selectedCertificate.verificationResults || {},
											null,
											2,
										)}
									</pre>
								</div>
							</div>

							{manualUpdateAllowed ? (
								<form
									onSubmit={submitManualReview}
									className="space-y-4 rounded-xl border border-slate-200 p-4"
								>
									<div>
										<h3 className="text-lg font-semibold text-slate-900">
											Manual Status Update
										</h3>
										<p className="text-sm text-slate-500">
											Submit `PUT /certificates/:id/verify` for manual review or
											admin and company-admin overrides.
										</p>
									</div>

									<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
										<select
											className="rounded-lg border border-slate-300 px-3 py-2"
											value={manualForm.status}
											onChange={(event) =>
												setManualForm((current) => ({
													...current,
													status: event.target.value,
												}))
											}
										>
											{CERTIFICATE_STATUSES.map((status) => (
												<option key={status} value={status}>
													{status}
												</option>
											))}
										</select>
										<select
											className="rounded-lg border border-slate-300 px-3 py-2"
											value={manualForm.verificationMethod}
											onChange={(event) =>
												setManualForm((current) => ({
													...current,
													verificationMethod: event.target.value,
												}))
											}
										>
											<option value="manual_review">manual_review</option>
											<option value="database_check">database_check</option>
											<option value="system">system</option>
											<option value="ai_analysis">ai_analysis</option>
										</select>
									</div>

									<textarea
										className="min-h-[90px] w-full rounded-lg border border-slate-300 px-3 py-2"
										placeholder="Reason for this override"
										value={manualForm.reason}
										onChange={(event) =>
											setManualForm((current) => ({
												...current,
												reason: event.target.value,
											}))
										}
									/>

									<textarea
										className="min-h-[120px] w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
										placeholder='Optional JSON for verificationResults, for example {"reviewedBy":"ops"}'
										value={manualForm.verificationResults}
										onChange={(event) =>
											setManualForm((current) => ({
												...current,
												verificationResults: event.target.value,
											}))
										}
									/>

									{manualError ? (
										<div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
											{manualError}
										</div>
									) : null}
									{manualSuccess ? (
										<div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
											{manualSuccess}
										</div>
									) : null}

									<button
										type="submit"
										disabled={manualLoading}
										className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
									>
										{manualLoading ? (
											<Loader className="h-4 w-4 animate-spin" />
										) : (
											<CheckCircle2 className="h-4 w-4" />
										)}
										Update status
									</button>
								</form>
							) : (
								<div className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
									Your role can inspect certificate details here, but manual
									status overrides are limited to admins and company admins.
								</div>
							)}
						</div>
					) : (
						<div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500">
							Select a certificate from the table to inspect its backend detail
							response and, when allowed, submit a manual status update.
						</div>
					)}
				</section>
			</div>

			<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<div className="mb-4">
					<h2 className="text-xl font-semibold text-slate-900">
						Candidate Validation
					</h2>
					<p className="text-sm text-slate-500">
						Use `POST /certificates/validate` to compare a candidate document
						against trusted records.
					</p>
				</div>

				{validationAllowed ? (
					<div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
						<form onSubmit={submitValidation} className="space-y-6">
							<CertificateFormFields
								values={validationValues}
								onRootChange={updateValidationRoot}
								onSectionChange={updateValidationSection}
								onSubjectChange={updateValidationSubject}
								onAddSubject={addValidationSubject}
								onRemoveSubject={removeValidationSubject}
							/>

							<div className="space-y-2">
								<label className="block text-sm font-medium text-slate-700">
									Optional candidate file
								</label>
								<input
									type="file"
									accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif"
									onChange={(event) =>
										setValidationFile(event.target.files?.[0] || null)
									}
									className="w-full rounded-lg border border-slate-300 px-3 py-2"
								/>
								<p className="text-xs text-slate-500">
									The file is optional for `/certificates/validate`, but when
									provided it must meet the 10MB and allowed-type rules.
								</p>
							</div>

							{validationError ? (
								<div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
									{validationError}
								</div>
							) : null}

							<button
								type="submit"
								disabled={validationLoading}
								className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
							>
								{validationLoading ? (
									<Loader className="h-4 w-4 animate-spin" />
								) : (
									<FileSearch className="h-4 w-4" />
								)}
								Validate candidate certificate
							</button>
						</form>

						<div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
							<h3 className="text-lg font-semibold text-slate-900">
								Validation Result
							</h3>
							{validationResult ? (
								<div className="mt-4 space-y-4 text-sm">
									<div className="rounded-xl border border-slate-200 bg-white p-4">
										<div className="flex items-start justify-between gap-3">
											<div>
												<p className="font-semibold text-slate-900">
													{validationResult.message}
												</p>
												<p className="text-slate-500">
													Match type: {validationResult.matchType || 'none'}
												</p>
											</div>
											<span
												className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClasses(
													validationResult.verificationStatus,
												)}`}
											>
												{validationResult.verificationStatus}
											</span>
										</div>
									</div>

									<div className="rounded-xl border border-slate-200 bg-white p-4">
										<p className="font-semibold text-slate-900">Candidate</p>
										<pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
											{JSON.stringify(
												validationResult.candidateCertificate,
												null,
												2,
											)}
										</pre>
									</div>

									<div className="rounded-xl border border-slate-200 bg-white p-4">
										<p className="font-semibold text-slate-900">
											Trusted certificate match
										</p>
										{validationResult.trustedCertificate ? (
											<>
												<p className="mt-2 text-slate-600">
													{validationResult.trustedCertificate.certificateId} |{' '}
													{validationResult.trustedCertificate.studentName}
												</p>
												<p className="text-slate-500">
													{validationResult.trustedCertificate.institution
														?.name || 'Unknown institution'}
												</p>
											</>
										) : (
											<p className="mt-2 text-slate-500">
												No trusted certificate record was matched.
											</p>
										)}
									</div>
								</div>
							) : (
								<div className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500">
									Run a validation request to inspect the backend comparison
									response here.
								</div>
							)}
						</div>
					</div>
				) : (
					<div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
						Candidate validation is available to admins, institution admins,
						university admins, and company admins. Your current role can still
						browse certificate records above.
					</div>
				)}
			</section>
		</div>
	);
}
