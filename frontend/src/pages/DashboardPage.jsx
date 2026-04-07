import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	AlertTriangle,
	ArrowUpRight,
	CheckCircle2,
	FileStack,
	Loader,
	ShieldAlert,
	University,
	XCircle,
} from "lucide-react";
import { api } from "../lib/api";
import { canAccessDashboard, getDefaultRouteForRole } from "../lib/roles";
import useAuth from "../hooks/useAuth";
import { normalizeCertificate, getStatusClasses } from "../lib/certificates";

const PERIOD_OPTIONS = [
	{ value: "7d", label: "Last 7 days" },
	{ value: "30d", label: "Last 30 days" },
	{ value: "90d", label: "Last 90 days" },
];

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

function StatCard({ icon: Icon, title, value, subtitle, colorClasses }) {
	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<div className="flex items-center justify-between gap-4">
				<div>
					<p className="text-sm font-medium text-slate-500">{title}</p>
					<p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
					{subtitle ? (
						<p className="mt-1 text-sm text-slate-500">{subtitle}</p>
					) : null}
				</div>
				<div
					className={`flex h-12 w-12 items-center justify-center rounded-full ${colorClasses}`}
				>
					<Icon className="h-6 w-6" />
				</div>
			</div>
		</div>
	);
}

export default function DashboardPage() {
	const [period, setPeriod] = useState("30d");
	const [stats, setStats] = useState(null);
	const [trends, setTrends] = useState([]);
	const [institutionStats, setInstitutionStats] = useState([]);
	const [alerts, setAlerts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const navigate = useNavigate();
	const { user } = useAuth();

	useEffect(() => {
		if (!canAccessDashboard(user?.role)) {
			navigate(getDefaultRouteForRole(user?.role), { replace: true });
		}
	}, [navigate, user?.role]);

	useEffect(() => {
		let isActive = true;

		async function fetchDashboard() {
			setLoading(true);
			setError("");

			try {
				const [statsResponse, trendsResponse, alertsResponse] = await Promise.all([
					api.get("/dashboard/stats"),
					api.get("/dashboard/trends", {
						params: { period },
					}),
					api.get("/dashboard/alerts"),
				]);

				if (!isActive) {
					return;
				}

				setStats(statsResponse.data);
				setTrends(Array.isArray(trendsResponse.data?.trends) ? trendsResponse.data.trends : []);
				setInstitutionStats(
					Array.isArray(trendsResponse.data?.institutionStats)
						? trendsResponse.data.institutionStats
						: []
				);
				setAlerts(
					Array.isArray(alertsResponse.data)
						? alertsResponse.data
								.map(normalizeCertificate)
								.filter(Boolean)
						: []
				);
			} catch (requestError) {
				if (requestError?.response?.status === 403) {
					navigate(getDefaultRouteForRole(user?.role), { replace: true });
					return;
				}

				if (isActive) {
					setError(
						getErrorMessage(requestError, "Unable to load dashboard data.")
					);
				}
			} finally {
				if (isActive) {
					setLoading(false);
				}
			}
		}

		fetchDashboard();

		return () => {
			isActive = false;
		};
	}, [navigate, period, user?.role]);

	const overview = stats?.overview || {};
	const recentVerifications = Array.isArray(stats?.recentVerifications)
		? stats.recentVerifications
		: [];
	const monthlyStats = Array.isArray(stats?.monthlyStats) ? stats.monthlyStats : [];

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
				<div>
					<h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
					<p className="text-slate-500">
						Live certificate metrics, fraud trends, and alert monitoring from
						the backend admin endpoints.
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					{PERIOD_OPTIONS.map((option) => (
						<button
							key={option.value}
							type="button"
							onClick={() => setPeriod(option.value)}
							className={`rounded-lg border px-3 py-2 text-sm font-medium ${
								period === option.value
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
				<div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
					<AlertTriangle className="h-5 w-5" />
					<span>{error}</span>
				</div>
			) : null}

			{loading ? (
				<div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
					<div className="flex items-center gap-3 text-slate-600">
						<Loader className="h-5 w-5 animate-spin" />
						<span>Loading dashboard data...</span>
					</div>
				</div>
			) : (
				<>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
						<StatCard
							title="Total Certificates"
							value={overview.totalCertificates ?? 0}
							subtitle={`Verification rate ${overview.verificationRate ?? 0}%`}
							icon={FileStack}
							colorClasses="bg-blue-100 text-blue-700"
						/>
						<StatCard
							title="Verified"
							value={overview.verifiedCertificates ?? 0}
							subtitle={`Pending ${overview.pendingCertificates ?? 0}`}
							icon={CheckCircle2}
							colorClasses="bg-emerald-100 text-emerald-700"
						/>
						<StatCard
							title="Suspicious / Fake"
							value={`${overview.suspiciousCertificates ?? 0} / ${overview.fakeCertificates ?? 0}`}
							subtitle={`Fraud rate ${overview.fraudRate ?? 0}%`}
							icon={ShieldAlert}
							colorClasses="bg-amber-100 text-amber-700"
						/>
						<StatCard
							title="Institutions"
							value={`${overview.verifiedInstitutions ?? 0} / ${overview.totalInstitutions ?? 0}`}
							subtitle="Verified / Total"
							icon={University}
							colorClasses="bg-violet-100 text-violet-700"
						/>
					</div>

					<div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
						<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
							<div className="flex items-center justify-between gap-3">
								<div>
									<h2 className="text-xl font-semibold text-slate-900">
										Recent Verifications
									</h2>
									<p className="text-sm text-slate-500">
										Last 10 verification log entries returned by `/dashboard/stats`.
									</p>
								</div>
							</div>
							<div className="mt-4 overflow-x-auto">
								<table className="min-w-full text-left text-sm">
									<thead className="border-b border-slate-200 text-slate-500">
										<tr>
											<th className="pb-3 pr-4 font-medium">Certificate</th>
											<th className="pb-3 pr-4 font-medium">Student</th>
											<th className="pb-3 pr-4 font-medium">Result</th>
											<th className="pb-3 pr-4 font-medium">Verifier</th>
											<th className="pb-3 font-medium">When</th>
										</tr>
									</thead>
									<tbody>
										{recentVerifications.length === 0 ? (
											<tr>
												<td className="py-6 text-slate-500" colSpan={5}>
													No recent verification activity yet.
												</td>
											</tr>
										) : (
											recentVerifications.map((entry) => (
												<tr key={entry._id} className="border-b border-slate-100">
													<td className="py-3 pr-4 font-medium text-slate-800">
														{entry.certificateId?.certificateId || "--"}
													</td>
													<td className="py-3 pr-4 text-slate-600">
														{entry.certificateId?.studentName || "--"}
													</td>
													<td className="py-3 pr-4">
														<span
															className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClasses(
																entry.result
															)}`}
														>
															{entry.result}
														</span>
													</td>
													<td className="py-3 pr-4 text-slate-600">
														{entry.verifiedBy?.email || "--"}
													</td>
													<td className="py-3 text-slate-500">
														{formatDateTime(entry.timestamp)}
													</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						</section>

						<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
							<h2 className="text-xl font-semibold text-slate-900">
								Recent Alerts
							</h2>
							<p className="text-sm text-slate-500">
								Suspicious and fake certificates returned by `/dashboard/alerts`.
							</p>
							<div className="mt-4 space-y-3">
								{alerts.length === 0 ? (
									<div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
										No suspicious or fake certificates were returned.
									</div>
								) : (
									alerts.slice(0, 6).map((alert) => (
										<div
											key={alert.id}
											className="rounded-xl border border-slate-200 p-4"
										>
											<div className="flex items-start justify-between gap-3">
												<div>
													<p className="font-semibold text-slate-900">
														{alert.certificateId}
													</p>
													<p className="text-sm text-slate-600">
														{alert.studentName || "Unknown student"}
													</p>
													<p className="text-xs text-slate-500">
														{alert.institution?.name || "Unknown institution"}
													</p>
												</div>
												<span
													className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClasses(
														alert.verificationStatus
													)}`}
												>
													{alert.verificationStatus}
												</span>
											</div>
										</div>
									))
								)}
							</div>
						</section>
					</div>

					<div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
						<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
							<div className="flex items-center justify-between gap-3">
								<div>
									<h2 className="text-xl font-semibold text-slate-900">
										Monthly Status Totals
									</h2>
									<p className="text-sm text-slate-500">
										12-month summary from `/dashboard/stats`.
									</p>
								</div>
								<ArrowUpRight className="h-5 w-5 text-slate-400" />
							</div>
							<div className="mt-4 overflow-x-auto">
								<table className="min-w-full text-left text-sm">
									<thead className="border-b border-slate-200 text-slate-500">
										<tr>
											<th className="pb-3 pr-4 font-medium">Month</th>
											<th className="pb-3 pr-4 font-medium">Verified</th>
											<th className="pb-3 pr-4 font-medium">Suspicious</th>
											<th className="pb-3 pr-4 font-medium">Fake</th>
											<th className="pb-3 font-medium">Pending</th>
										</tr>
									</thead>
									<tbody>
										{monthlyStats.length === 0 ? (
											<tr>
												<td className="py-6 text-slate-500" colSpan={5}>
													No monthly data returned yet.
												</td>
											</tr>
										) : (
											monthlyStats.map((item) => (
												<tr key={item.month} className="border-b border-slate-100">
													<td className="py-3 pr-4 font-medium text-slate-800">
														{item.month}
													</td>
													<td className="py-3 pr-4 text-emerald-700">
														{item.verified}
													</td>
													<td className="py-3 pr-4 text-amber-700">
														{item.suspicious}
													</td>
													<td className="py-3 pr-4 text-rose-700">{item.fake}</td>
													<td className="py-3 text-slate-600">{item.pending}</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						</section>

						<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
							<h2 className="text-xl font-semibold text-slate-900">
								Institution Trend Leaders
							</h2>
							<p className="text-sm text-slate-500">
								Top institutions returned by `/dashboard/trends` for {period}.
							</p>
							<div className="mt-4 space-y-3">
								{institutionStats.length === 0 ? (
									<div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
										No institution trend records were returned.
									</div>
								) : (
									institutionStats.map((item) => (
										<div
											key={`${item.institutionCode}-${item.institutionName}`}
											className="rounded-xl border border-slate-200 p-4"
										>
											<div className="flex items-start justify-between gap-3">
												<div>
													<p className="font-semibold text-slate-900">
														{item.institutionName}
													</p>
													<p className="text-xs uppercase tracking-wide text-slate-500">
														{item.institutionCode}
													</p>
												</div>
												<div className="text-right">
													<p className="text-sm font-semibold text-slate-900">
														{item.total} certificates
													</p>
													<p className="text-xs text-slate-500">
														{Math.round(item.verificationRate || 0)}% verified
													</p>
												</div>
											</div>
											<div className="mt-3 grid grid-cols-3 gap-3 text-sm">
												<div className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
													Verified: {item.verified}
												</div>
												<div className="rounded-lg bg-amber-50 px-3 py-2 text-amber-700">
													Suspicious: {item.suspicious}
												</div>
												<div className="rounded-lg bg-rose-50 px-3 py-2 text-rose-700">
													Fake: {item.fake}
												</div>
											</div>
										</div>
									))
								)}
							</div>
						</section>
					</div>

					<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
						<h2 className="text-xl font-semibold text-slate-900">
							Daily Trend Buckets
						</h2>
						<p className="text-sm text-slate-500">
							Grouped status counts returned by `/dashboard/trends`.
						</p>
						<div className="mt-4 overflow-x-auto">
							<table className="min-w-full text-left text-sm">
								<thead className="border-b border-slate-200 text-slate-500">
									<tr>
										<th className="pb-3 pr-4 font-medium">Date</th>
										<th className="pb-3 pr-4 font-medium">Verified</th>
										<th className="pb-3 pr-4 font-medium">Suspicious</th>
										<th className="pb-3 pr-4 font-medium">Fake</th>
										<th className="pb-3 font-medium">Pending</th>
									</tr>
								</thead>
								<tbody>
									{trends.length === 0 ? (
										<tr>
											<td className="py-6 text-slate-500" colSpan={5}>
												No trend data was returned for this period.
											</td>
										</tr>
									) : (
										trends.map((item) => {
											const statusMap = (item.statuses || []).reduce(
												(accumulator, statusEntry) => ({
													...accumulator,
													[statusEntry.status]: statusEntry.count,
												}),
												{}
											);

											return (
												<tr key={item._id} className="border-b border-slate-100">
													<td className="py-3 pr-4 font-medium text-slate-800">
														{item._id}
													</td>
													<td className="py-3 pr-4 text-emerald-700">
														{statusMap.verified || 0}
													</td>
													<td className="py-3 pr-4 text-amber-700">
														{statusMap.suspicious || 0}
													</td>
													<td className="py-3 pr-4 text-rose-700">
														{statusMap.fake || 0}
													</td>
													<td className="py-3 text-slate-600">
														{statusMap.pending || 0}
													</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
					</section>
				</>
			)}
		</div>
	);
}
