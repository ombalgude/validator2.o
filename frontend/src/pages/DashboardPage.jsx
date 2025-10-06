import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
	ShieldCheck,
	FileStack,
	CheckCircle2,
	AlertTriangle,
	XCircle,
} from "lucide-react";
import AppHeader from "../components/Header";
import AppFooter from "../components/Footer";

// A simple, reusable button for the dashboard
const Button = ({ children, className = "", ...props }) => (
	<button
		className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-sm transition-all duration-300 ${className}`}
		{...props}
	>
		{children}
	</button>
);

export default function DashboardPage() {
	const [stats, setStats] = useState(null);
	const [error, setError] = useState("");
	const [showRaw, setShowRaw] = useState(false);

	useEffect(() => {
		const fetchStats = () => {
			try {
				const mockData = {
					total: 1258,
					verified: 1152,
					suspicious: 74,
					fake: 32,
					recent: [
						{
							certificateId: "CERT-2025-0A8B",
							studentName: "Alice Johnson",
							status: "verified",
							createdAt: new Date().toISOString(),
						},
						{
							certificateId: "CERT-2025-1C5D",
							studentName: "Bob Williams",
							status: "suspicious",
							createdAt: new Date(
								Date.now() - 3600000
							).toISOString(),
						},
						{
							certificateId: "CERT-2025-2E3F",
							studentName: "Charlie Brown",
							status: "fake",
							createdAt: new Date(
								Date.now() - 7200000
							).toISOString(),
						},
						{
							certificateId: "CERT-2025-3G7H",
							studentName: "Diana Miller",
							status: "verified",
							createdAt: new Date(
								Date.now() - 10800000
							).toISOString(),
						},
						{
							certificateId: "CERT-2025-4I9J",
							studentName: "Ethan Davis",
							status: "verified",
							createdAt: new Date(
								Date.now() - 14400000
							).toISOString(),
						},
					],
				};
				setStats(mockData);
			} catch (err) {
				setError(err.message);
			}
		};

		// Simulating network delay
		const timer = setTimeout(fetchStats, 1000);
		return () => clearTimeout(timer); // Cleanup timer on unmount

		/*
        // Your original API call can be used here:
        axios
            .get("/api/dashboard/stats")
            .then((res) => setStats(res.data))
            .catch((err) => setError(err.response?.data?.message || err.message));
        */
	}, []);

	const StatCard = ({ icon: Icon, title, value, color, delay }) => (
		<div
			className={`bg-white p-6 rounded-2xl shadow-lg border border-gray-100 flex items-center gap-6`}
		>
			<div className={`p-4 rounded-full ${color.bg} ${color.text}`}>
				<Icon size={28} />
			</div>
			<div>
				<div className="text-gray-500 text-md">{title}</div>
				<div className="text-3xl font-bold text-gray-800">
					{value ?? "—"}
				</div>
			</div>
		</div>
	);

	const pct = (num, den) =>
		typeof num === "number" && typeof den === "number" && den > 0
			? `${Math.round((num / den) * 100)}%`
			: "—";

	const getStatusBadge = (status) => {
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
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 font-sans antialiased text-gray-800">
			{/* Header */}
			<AppHeader />

			{/* Main Dashboard Content */}
			<main className="max-w-7xl mx-auto px-6 py-10">
				<h1 className="text-4xl font-extrabold text-gray-900 mb-8">
					Dashboard
				</h1>

				{error && (
					<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
						{error}
					</div>
				)}

				{!stats && !error && (
					<div className="text-center py-12 text-gray-500">
						Loading dashboard data...
					</div>
				)}

				{stats && (
					<div className="space-y-8">
						{/* Stat Cards Section */}
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
							<StatCard
								title="Total Verifications"
								value={stats.total}
								icon={FileStack}
								color={{
									bg: "bg-blue-100",
									text: "text-blue-600",
								}}
								delay={1}
							/>
							<StatCard
								title="Verified"
								value={`${stats.verified} (${pct(
									stats.verified,
									stats.total
								)})`}
								icon={CheckCircle2}
								color={{
									bg: "bg-emerald-100",
									text: "text-emerald-600",
								}}
								delay={2}
							/>
							<StatCard
								title="Suspicious"
								value={`${stats.suspicious} (${pct(
									stats.suspicious,
									stats.total
								)})`}
								icon={AlertTriangle}
								color={{
									bg: "bg-amber-100",
									text: "text-amber-600",
								}}
								delay={3}
							/>
							<StatCard
								title="Fake"
								value={`${stats.fake} (${pct(
									stats.fake,
									stats.total
								)})`}
								icon={XCircle}
								color={{
									bg: "bg-rose-100",
									text: "text-rose-600",
								}}
								delay={4}
							/>
						</div>

						{/* Recent Verifications Table */}
						<div className="bg-white rounded-2xl shadow-lg p-6">
							<h2 className="text-xl font-bold text-gray-800 mb-4">
								Recent Verifications
							</h2>
							<div className="overflow-x-auto">
								<table className="w-full text-left">
									<thead className="border-b-2 border-gray-100">
										<tr>
											<th className="p-3 text-sm font-semibold text-gray-500">
												Certificate ID
											</th>
											<th className="p-3 text-sm font-semibold text-gray-500">
												Student
											</th>
											<th className="p-3 text-sm font-semibold text-gray-500">
												Status
											</th>
											<th className="p-3 text-sm font-semibold text-gray-500">
												Date
											</th>
										</tr>
									</thead>
									<tbody>
										{stats.recent.map((r, idx) => (
											<tr
												key={idx}
												className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
											>
												<td className="p-3 font-mono text-gray-700">
													{r.certificateId}
												</td>
												<td className="p-3 text-gray-800">
													{r.studentName}
												</td>
												<td className="p-3">
													<span
														className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusBadge(
															r.status
														)}`}
													>
														{r.status}
													</span>
												</td>
												<td className="p-3 text-gray-500">
													{new Date(
														r.createdAt
													).toLocaleString()}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>

						{/* Raw Stats */}
						<div
							className="bg-white rounded-2xl shadow-lg p-6 transform transition-all duration-500 ease-out"
							style={{ animationDelay: "600ms" }}
						>
							<div className="flex items-center justify-between">
								<h2 className="text-xl font-bold text-gray-800">
									Raw Stats
								</h2>
								<Button
									onClick={() => setShowRaw((s) => !s)}
									className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
								>
									{showRaw ? "Hide" : "Show"}
								</Button>
							</div>
							<div
								className={`
								transition-all duration-500 ease-in-out grid
								${showRaw ? "grid-rows-[1fr] opacity-100 pt-4" : "grid-rows-[0fr] opacity-0"}
							`}
							>
								<div className="overflow-hidden">
									<div className="bg-gray-900 text-gray-200 p-4 rounded-lg">
										<pre className="text-sm overflow-x-auto">
											{stats
												? JSON.stringify(stats, null, 2)
												: ""}
										</pre>
									</div>
								</div>
							</div>
						</div>
					</div>
				)}
			</main>
			<AppFooter />
		</div>
	);
}
