import React, { useEffect, useState } from "react";
import {
	AlertTriangle,
	CheckCircle2,
	Clock3,
	ExternalLink,
	Loader,
	RefreshCw,
	ShieldCheck,
	University,
	UserCheck,
	UserX,
	XCircle,
} from "lucide-react";
import { api } from "../lib/api";
import { normalizeInstitutionSummary } from "../lib/normalizers";

const STATUS_OPTIONS = [
	{ value: "pending", label: "Pending" },
	{ value: "approved", label: "Approved" },
	{ value: "rejected", label: "Rejected" },
	{ value: "all", label: "All" },
];

const STATUS_META = {
	pending: {
		label: "Pending",
		classes: "bg-amber-50 text-amber-700 border-amber-200",
		icon: Clock3,
	},
	approved: {
		label: "Approved",
		classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
		icon: CheckCircle2,
	},
	rejected: {
		label: "Rejected",
		classes: "bg-rose-50 text-rose-700 border-rose-200",
		icon: XCircle,
	},
};

function toText(value) {
	return value === null || value === undefined ? "" : String(value).trim();
}

function getErrorMessage(error, fallback) {
	return error?.response?.data?.message || error?.message || fallback;
}

function formatDateTime(value) {
	if (!value) {
		return "--";
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "--";
	}

	return date.toLocaleString();
}

function normalizeDocuments(value) {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.map((document, index) => ({
			name: toText(document?.name) || `Document ${index + 1}`,
			url: toText(document?.url),
			documentType: toText(document?.documentType) || "supporting_document",
		}))
		.filter((document) => document.name || document.url);
}

function normalizeRequest(value) {
	if (!value) {
		return null;
	}

	const user = value.userId && typeof value.userId === "object" ? value.userId : null;
	const institution = normalizeInstitutionSummary(value.institutionId);

	return {
		id: value.id || value._id || "",
		fullName: toText(value.fullName || user?.fullName),
		email: toText(value.email || user?.email).toLowerCase(),
		universityName: toText(value.universityName),
		department: toText(value.department),
		title: toText(value.title) || "University Admin",
		adminCode: toText(value.adminCode),
		status: toText(value.status) || "pending",
		submittedDocuments: normalizeDocuments(value.submittedDocuments),
		institution,
		createdAt: value.createdAt || null,
		reviewedAt: value.reviewedAt || null,
		reviewNote: toText(value.reviewNote),
		reviewedBy:
			value.reviewedBy && typeof value.reviewedBy === "object"
				? {
						fullName: toText(value.reviewedBy.fullName),
						email: toText(value.reviewedBy.email),
					}
				: null,
	};
}

function StatusPill({ status }) {
	const meta = STATUS_META[status] || STATUS_META.pending;
	const Icon = meta.icon;

	return (
		<span
			className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${meta.classes}`}
		>
			<Icon className="h-3.5 w-3.5" />
			{meta.label}
		</span>
	);
}

function ConfirmationDialog({
	action,
	error,
	loading,
	note,
	onCancel,
	onConfirm,
	onNoteChange,
}) {
	if (!action) {
		return null;
	}

	const isApprove = action.type === "approve";
	const Icon = isApprove ? UserCheck : UserX;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
			<div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
				<div className="flex items-start gap-3">
					<div
						className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
							isApprove
								? "bg-emerald-100 text-emerald-700"
								: "bg-rose-100 text-rose-700"
						}`}
					>
						<Icon className="h-5 w-5" />
					</div>
					<div>
						<h2 className="text-xl font-semibold text-slate-900">
							{isApprove ? "Approve Request" : "Reject Request"}
						</h2>
						<p className="mt-1 text-sm text-slate-500">
							{action.request.fullName || action.request.email} |{" "}
							{action.request.universityName}
						</p>
					</div>
				</div>

				<textarea
					className="mt-5 min-h-[96px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
					placeholder="Review note"
					value={note}
					onChange={(event) => onNoteChange(event.target.value)}
				/>

				{error ? (
					<div className="mt-4 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
						<AlertTriangle className="h-5 w-5" />
						<span>{error}</span>
					</div>
				) : null}

				<div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
					<button
						type="button"
						onClick={onCancel}
						disabled={loading}
						className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={onConfirm}
						disabled={loading}
						className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
							isApprove
								? "bg-emerald-600 hover:bg-emerald-700"
								: "bg-rose-600 hover:bg-rose-700"
						}`}
					>
						{loading ? <Loader className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
						{isApprove ? "Approve" : "Reject"}
					</button>
				</div>
			</div>
		</div>
	);
}

export default function UniversityAdminApprovals() {
	const [requests, setRequests] = useState([]);
	const [statusFilter, setStatusFilter] = useState("pending");
	const [statusCounts, setStatusCounts] = useState({
		pending: 0,
		approved: 0,
		rejected: 0,
	});
	const [loading, setLoading] = useState(true);
	const [actionLoading, setActionLoading] = useState(false);
	const [error, setError] = useState("");
	const [actionError, setActionError] = useState("");
	const [notice, setNotice] = useState("");
	const [confirmation, setConfirmation] = useState(null);
	const [confirmationNote, setConfirmationNote] = useState("");

	async function fetchRequests() {
		setLoading(true);
		setError("");

		try {
			const params = statusFilter === "all" ? {} : { status: statusFilter };
			const response = await api.get("/university-admin-requests", {
				params,
			});
			const normalizedRequests = Array.isArray(response.data?.requests)
				? response.data.requests.map(normalizeRequest).filter(Boolean)
				: [];

			setRequests(normalizedRequests);
			setStatusCounts(response.data?.statusCounts || {});
		} catch (requestError) {
			setError(
				getErrorMessage(requestError, "Unable to load university admin requests."),
			);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		fetchRequests();
	}, [statusFilter]);

	function openConfirmation(type, request) {
		setActionError("");
		setNotice("");

		setConfirmation({ type, request });
		setConfirmationNote("");
	}

	async function confirmAction() {
		if (!confirmation) {
			return;
		}

		setActionLoading(true);
		setActionError("");
		setNotice("");

		try {
			const request = confirmation.request;
			const payload = {
				reviewNote: confirmationNote.trim(),
			};
			const response = await api.put(
				`/university-admin-requests/${request.id}/${confirmation.type}`,
				payload,
			);

			setNotice(response.data?.message || "Request updated successfully.");
			setConfirmation(null);
			setConfirmationNote("");
			await fetchRequests();
		} catch (requestError) {
			setActionError(
				getErrorMessage(requestError, "Unable to update this request."),
			);
		} finally {
			setActionLoading(false);
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
				<div>
					<h1 className="text-3xl font-bold text-slate-900">
						University Admin Approvals
					</h1>
					<p className="text-slate-500">
						Review university admin registration requests and grant access.
					</p>
				</div>
				<button
					type="button"
					onClick={fetchRequests}
					className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
				>
					<RefreshCw className="h-4 w-4" />
					Refresh
				</button>
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
					<p className="text-sm font-medium text-slate-500">Pending</p>
					<p className="mt-2 text-3xl font-bold text-amber-700">
						{statusCounts.pending || 0}
					</p>
				</div>
				<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
					<p className="text-sm font-medium text-slate-500">Approved</p>
					<p className="mt-2 text-3xl font-bold text-emerald-700">
						{statusCounts.approved || 0}
					</p>
				</div>
				<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
					<p className="text-sm font-medium text-slate-500">Rejected</p>
					<p className="mt-2 text-3xl font-bold text-rose-700">
						{statusCounts.rejected || 0}
					</p>
				</div>
			</div>

			<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div className="flex items-center gap-3">
						<div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
							<ShieldCheck className="h-5 w-5" />
						</div>
						<div>
							<h2 className="text-xl font-semibold text-slate-900">
								Requests
							</h2>
							<p className="text-sm text-slate-500">
								{requests.length} {statusFilter === "all" ? "total" : statusFilter} requests shown.
							</p>
						</div>
					</div>
					<div className="flex flex-wrap gap-2">
						{STATUS_OPTIONS.map((option) => (
							<button
								key={option.value}
								type="button"
								onClick={() => setStatusFilter(option.value)}
								className={`rounded-lg border px-3 py-2 text-sm font-medium ${
									statusFilter === option.value
										? "border-indigo-600 bg-indigo-600 text-white"
										: "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
								}`}
							>
								{option.label}
							</button>
						))}
					</div>
				</div>

				{error ? (
					<div className="mt-5 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
						<AlertTriangle className="h-5 w-5" />
						<span>{error}</span>
					</div>
				) : null}

				{actionError ? (
					<div className="mt-5 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
						<AlertTriangle className="h-5 w-5" />
						<span>{actionError}</span>
					</div>
				) : null}

				{notice ? (
					<div className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
						<CheckCircle2 className="h-5 w-5" />
						<span>{notice}</span>
					</div>
				) : null}

				{loading ? (
					<div className="flex min-h-[280px] items-center justify-center text-slate-500">
						<Loader className="mr-3 h-5 w-5 animate-spin" />
						Loading requests...
					</div>
				) : requests.length === 0 ? (
					<div className="mt-6 rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
						No university admin requests match this status.
					</div>
				) : (
					<div className="mt-6 overflow-x-auto">
						<table className="min-w-full text-left text-sm">
							<thead className="border-b border-slate-200 text-slate-500">
								<tr>
									<th className="pb-3 pr-4 font-medium">Applicant</th>
									<th className="pb-3 pr-4 font-medium">University</th>
									<th className="pb-3 pr-4 font-medium">Documents</th>
									<th className="pb-3 pr-4 font-medium">Status</th>
									<th className="pb-3 font-medium">Actions</th>
								</tr>
							</thead>
							<tbody>
								{requests.map((request) => (
									<tr key={request.id} className="border-b border-slate-100 align-top">
										<td className="py-4 pr-4">
											<p className="font-semibold text-slate-900">
												{request.fullName || "--"}
											</p>
											<p className="text-slate-500">{request.email || "--"}</p>
											<p className="mt-2 text-xs text-slate-400">
												Submitted {formatDateTime(request.createdAt)}
											</p>
										</td>
										<td className="py-4 pr-4">
											<div className="flex items-start gap-2">
												<University className="mt-0.5 h-4 w-4 text-slate-400" />
												<div>
													<p className="font-medium text-slate-800">
														{request.universityName || "--"}
													</p>
													<p className="text-slate-500">
														{request.title}
														{request.department ? ` | ${request.department}` : ""}
													</p>
													{request.adminCode ? (
														<p className="text-xs text-slate-400">
															Code {request.adminCode}
														</p>
													) : null}
													{request.institution?.name ? (
														<p className="mt-1 text-xs text-emerald-700">
															Linked to {request.institution.name}
															{request.institution.code
																? ` (${request.institution.code})`
																: ""}
														</p>
													) : request.status === "pending" ? (
														<p className="mt-1 text-xs text-slate-400">
															University record will be matched or created on approval.
														</p>
													) : null}
												</div>
											</div>
										</td>
										<td className="py-4 pr-4">
											{request.submittedDocuments.length === 0 ? (
												<span className="text-slate-400">No documents</span>
											) : (
												<div className="space-y-2">
													{request.submittedDocuments.map((document, index) => (
														<a
															key={`${request.id}-${index}`}
															href={document.url || "#"}
															target="_blank"
															rel="noreferrer"
															className="inline-flex max-w-[220px] items-center gap-1 break-all text-indigo-700 hover:text-indigo-900"
														>
															<ExternalLink className="h-3.5 w-3.5 shrink-0" />
															{document.name}
														</a>
													))}
												</div>
											)}
										</td>
										<td className="py-4 pr-4">
											<StatusPill status={request.status} />
											{request.reviewedAt ? (
												<p className="mt-2 text-xs text-slate-400">
													Reviewed {formatDateTime(request.reviewedAt)}
												</p>
											) : null}
										</td>
										<td className="py-4">
											{request.status === "pending" ? (
												<div className="flex flex-col gap-2">
													<button
														type="button"
														onClick={() => openConfirmation("approve", request)}
														className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
													>
														<UserCheck className="h-4 w-4" />
														Approve
													</button>
													<button
														type="button"
														onClick={() => openConfirmation("reject", request)}
														className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
													>
														<UserX className="h-4 w-4" />
														Reject
													</button>
												</div>
											) : (
												<p className="max-w-[220px] text-sm text-slate-500">
													{request.reviewNote || "No review note."}
												</p>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>

			<ConfirmationDialog
				action={confirmation}
				error={confirmation ? actionError : ""}
				loading={actionLoading}
				note={confirmationNote}
				onCancel={() => setConfirmation(null)}
				onConfirm={confirmAction}
				onNoteChange={setConfirmationNote}
			/>
		</div>
	);
}
