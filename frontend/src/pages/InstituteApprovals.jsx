import React, { useEffect, useState } from "react";
import {
	AlertTriangle,
	Building2,
	CheckCircle2,
	Clock3,
	Loader,
	Mail,
	MapPin,
	RefreshCw,
	Search,
	ShieldCheck,
	ShieldX,
	University,
} from "lucide-react";
import { api } from "../lib/api";

const STATUS_OPTIONS = [
	{ value: "pending", label: "Pending" },
	{ value: "verified", label: "Verified" },
	{ value: "all", label: "All" },
];

const STATUS_META = {
	pending: {
		label: "Pending",
		classes: "bg-amber-50 text-amber-700 border-amber-200",
		icon: Clock3,
	},
	verified: {
		label: "Verified",
		classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
		icon: CheckCircle2,
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

function normalizePerson(value) {
	if (!value || typeof value !== "object") {
		return null;
	}

	return {
		fullName: toText(value.fullName),
		email: toText(value.email).toLowerCase(),
		role: toText(value.role),
	};
}

function normalizeInstitution(value) {
	if (!value) {
		return null;
	}

	const address = value.address || {};
	const contactInfo = value.contactInfo || {};

	return {
		id: value.id || value._id || "",
		name: toText(value.name),
		code: toText(value.code),
		institutionType: toText(value.institutionType) || "institution",
		isVerified: Boolean(value.isVerified),
		address: {
			city: toText(address.city),
			state: toText(address.state),
			country: toText(address.country),
		},
		contactInfo: {
			email: toText(contactInfo.email).toLowerCase(),
			phone: toText(contactInfo.phone),
			website: toText(contactInfo.website),
		},
		accreditation: toText(value.accreditation),
		totalCertificates: Number(value.totalCertificates || 0),
		createdAt: value.createdAt || null,
		verifiedAt: value.verifiedAt || null,
		verificationReason: toText(value.verificationReason),
		createdBy: normalizePerson(value.createdBy),
		verifiedBy: normalizePerson(value.verifiedBy),
	};
}

function StatusPill({ isVerified }) {
	const status = isVerified ? "verified" : "pending";
	const meta = STATUS_META[status];
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

	const isVerify = action.type === "verify";
	const Icon = isVerify ? ShieldCheck : ShieldX;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
			<div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
				<div className="flex items-start gap-3">
					<div
						className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
							isVerify
								? "bg-emerald-100 text-emerald-700"
								: "bg-rose-100 text-rose-700"
						}`}
					>
						<Icon className="h-5 w-5" />
					</div>
					<div>
						<h2 className="text-xl font-semibold text-slate-900">
							{isVerify ? "Accept Institute" : "Suspend Institute"}
						</h2>
						<p className="mt-1 text-sm text-slate-500">
							{action.institution.name}{" "}
							{action.institution.code ? `(${action.institution.code})` : ""}
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
							isVerify
								? "bg-emerald-600 hover:bg-emerald-700"
								: "bg-rose-600 hover:bg-rose-700"
						}`}
					>
						{loading ? <Loader className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
						{isVerify ? "Accept" : "Suspend"}
					</button>
				</div>
			</div>
		</div>
	);
}

export default function InstituteApprovals() {
	const [institutions, setInstitutions] = useState([]);
	const [statusFilter, setStatusFilter] = useState("pending");
	const [searchInput, setSearchInput] = useState("");
	const [searchTerm, setSearchTerm] = useState("");
	const [statusCounts, setStatusCounts] = useState({
		pending: 0,
		verified: 0,
	});
	const [loading, setLoading] = useState(true);
	const [actionLoading, setActionLoading] = useState(false);
	const [error, setError] = useState("");
	const [actionError, setActionError] = useState("");
	const [notice, setNotice] = useState("");
	const [confirmation, setConfirmation] = useState(null);
	const [confirmationNote, setConfirmationNote] = useState("");

	async function fetchInstitutions() {
		setLoading(true);
		setError("");

		try {
			const listParams = {
				page: 1,
				limit: 100,
				sortBy: "createdAt",
				sortOrder: "desc",
			};

			if (statusFilter === "pending") {
				listParams.verified = false;
			}

			if (statusFilter === "verified") {
				listParams.verified = true;
			}

			if (searchTerm) {
				listParams.search = searchTerm;
			}

			const [listResponse, pendingResponse, verifiedResponse] =
				await Promise.all([
					api.get("/institutions", { params: listParams }),
					api.get("/institutions", {
						params: { page: 1, limit: 1, verified: false },
					}),
					api.get("/institutions", {
						params: { page: 1, limit: 1, verified: true },
					}),
				]);

			setInstitutions(
				Array.isArray(listResponse.data?.institutions)
					? listResponse.data.institutions
							.map(normalizeInstitution)
							.filter(Boolean)
					: []
			);
			setStatusCounts({
				pending: pendingResponse.data?.total || 0,
				verified: verifiedResponse.data?.total || 0,
			});
		} catch (requestError) {
			setError(getErrorMessage(requestError, "Unable to load institutes."));
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		fetchInstitutions();
	}, [statusFilter, searchTerm]);

	function submitSearch(event) {
		event.preventDefault();
		setSearchTerm(searchInput.trim());
	}

	function openConfirmation(type, institution) {
		setActionError("");
		setNotice("");
		setConfirmation({ type, institution });
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
			const response = await api.put(
				`/institutions/${confirmation.institution.id}/verify`,
				{
					isVerified: confirmation.type === "verify",
					verificationReason: confirmationNote.trim(),
				}
			);

			setNotice(response.data?.message || "Institute updated successfully.");
			setConfirmation(null);
			setConfirmationNote("");
			await fetchInstitutions();
		} catch (requestError) {
			setActionError(
				getErrorMessage(requestError, "Unable to update this institute.")
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
						Institute Acceptance
					</h1>
					<p className="text-slate-500">
						Review registered institutes before they can verify certificates.
					</p>
				</div>
				<button
					type="button"
					onClick={fetchInstitutions}
					className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
				>
					<RefreshCw className="h-4 w-4" />
					Refresh
				</button>
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
					<p className="text-sm font-medium text-slate-500">Pending</p>
					<p className="mt-2 text-3xl font-bold text-amber-700">
						{statusCounts.pending || 0}
					</p>
				</div>
				<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
					<p className="text-sm font-medium text-slate-500">Verified</p>
					<p className="mt-2 text-3xl font-bold text-emerald-700">
						{statusCounts.verified || 0}
					</p>
				</div>
			</div>

			<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
					<div className="flex items-center gap-3">
						<div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
							<University className="h-5 w-5" />
						</div>
						<div>
							<h2 className="text-xl font-semibold text-slate-900">
								Institutes
							</h2>
							<p className="text-sm text-slate-500">
								{institutions.length} {statusFilter === "all" ? "total" : statusFilter} institutes shown.
							</p>
						</div>
					</div>
					<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
						<form onSubmit={submitSearch} className="flex gap-2">
							<div className="relative min-w-0">
								<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
								<input
									type="search"
									value={searchInput}
									onChange={(event) => setSearchInput(event.target.value)}
									placeholder="Search name or code"
									className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 lg:w-64"
								/>
							</div>
							<button
								type="submit"
								className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
							>
								Search
							</button>
						</form>
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
						Loading institutes...
					</div>
				) : institutions.length === 0 ? (
					<div className="mt-6 rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
						No institutes match this view.
					</div>
				) : (
					<div className="mt-6 overflow-x-auto">
						<table className="min-w-full text-left text-sm">
							<thead className="border-b border-slate-200 text-slate-500">
								<tr>
									<th className="pb-3 pr-4 font-medium">Institute</th>
									<th className="pb-3 pr-4 font-medium">Contact</th>
									<th className="pb-3 pr-4 font-medium">Status</th>
									<th className="pb-3 pr-4 font-medium">Activity</th>
									<th className="pb-3 font-medium">Actions</th>
								</tr>
							</thead>
							<tbody>
								{institutions.map((institution) => (
									<tr key={institution.id} className="border-b border-slate-100 align-top">
										<td className="py-4 pr-4">
											<div className="flex items-start gap-2">
												<Building2 className="mt-0.5 h-4 w-4 text-slate-400" />
												<div>
													<p className="font-semibold text-slate-900">
														{institution.name || "--"}
													</p>
													<p className="text-slate-500">
														{institution.code || "--"} | {institution.institutionType}
													</p>
													<p className="mt-2 text-xs text-slate-400">
														Registered {formatDateTime(institution.createdAt)}
													</p>
													{institution.createdBy?.email ? (
														<p className="mt-1 text-xs text-slate-400">
															By {institution.createdBy.email}
														</p>
													) : null}
												</div>
											</div>
										</td>
										<td className="py-4 pr-4">
											{institution.contactInfo.email ? (
												<p className="flex items-center gap-1 text-slate-700">
													<Mail className="h-3.5 w-3.5 text-slate-400" />
													{institution.contactInfo.email}
												</p>
											) : (
												<p className="text-slate-400">No email</p>
											)}
											{institution.address.city ||
											institution.address.state ||
											institution.address.country ? (
												<p className="mt-2 flex items-center gap-1 text-slate-500">
													<MapPin className="h-3.5 w-3.5 text-slate-400" />
													{[
														institution.address.city,
														institution.address.state,
														institution.address.country,
													]
														.filter(Boolean)
														.join(", ")}
												</p>
											) : null}
										</td>
										<td className="py-4 pr-4">
											<StatusPill isVerified={institution.isVerified} />
											{institution.verifiedAt ? (
												<p className="mt-2 text-xs text-slate-400">
													Accepted {formatDateTime(institution.verifiedAt)}
												</p>
											) : null}
											{institution.verificationReason ? (
												<p className="mt-2 max-w-[240px] text-xs text-slate-500">
													{institution.verificationReason}
												</p>
											) : null}
										</td>
										<td className="py-4 pr-4">
											<p className="font-semibold text-slate-900">
												{institution.totalCertificates}
											</p>
											<p className="text-slate-500">certificates</p>
										</td>
										<td className="py-4">
											{institution.isVerified ? (
												<button
													type="button"
													onClick={() => openConfirmation("unverify", institution)}
													className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
												>
													<ShieldX className="h-4 w-4" />
													Suspend
												</button>
											) : (
												<button
													type="button"
													onClick={() => openConfirmation("verify", institution)}
													className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
												>
													<ShieldCheck className="h-4 w-4" />
													Accept
												</button>
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
