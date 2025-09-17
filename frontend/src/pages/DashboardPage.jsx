import React, { useState } from "react";

export default function DashboardPage() {
	const [stats, setStats] = useState(null);
	const [error, setError] = useState("");
	const [showRaw, setShowRaw] = useState(false);

	useEffect(() => {
		DashboardAPI.stats()
			.then(setStats)
			.catch((err) => setError(err.message));
	}, []);

	const StatCard = ({ title, value, accent }) => (
		<div
			className={`card border-l-4 ${accent} flex items-center justify-between`}
		>
			<div>
				<div className="text-slate-500 text-sm">{title}</div>
				<div className="text-2xl font-semibold">{value ?? "—"}</div>
			</div>
		</div>
	);

	const pct = (num, den) =>
		typeof num === "number" && typeof den === "number" && den > 0
			? `${Math.round((num / den) * 100)}%`
			: "—";

	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-semibold">Dashboard</h1>
			{error && <div className="text-red-600">{error}</div>}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<StatCard
					title="Total"
					value={stats?.total}
					accent="border-blue-500"
				/>
				<StatCard
					title="Verified"
					value={`${stats?.verified ?? "—"} (${pct(
						stats?.verified,
						stats?.total
					)})`}
					accent="border-emerald-500"
				/>
				<StatCard
					title="Suspicious"
					value={`${stats?.suspicious ?? "—"} (${pct(
						stats?.suspicious,
						stats?.total
					)})`}
					accent="border-amber-500"
				/>
				<StatCard
					title="Fake"
					value={`${stats?.fake ?? "—"} (${pct(
						stats?.fake,
						stats?.total
					)})`}
					accent="border-rose-500"
				/>
			</div>

			{Array.isArray(stats?.recent) && stats.recent.length > 0 && (
				<div className="card">
					<h2 className="font-medium mb-3">Recent Verifications</h2>
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="text-left text-slate-500">
									<th className="py-2 pr-4">
										Certificate ID
									</th>
									<th className="py-2 pr-4">Student</th>
									<th className="py-2 pr-4">Status</th>
									<th className="py-2 pr-4">Date</th>
								</tr>
							</thead>
							<tbody>
								{stats.recent.slice(0, 10).map((r, idx) => (
									<tr key={idx} className="border-t">
										<td className="py-2 pr-4">
											{r.certificateId || "—"}
										</td>
										<td className="py-2 pr-4">
											{r.studentName || "—"}
										</td>
										<td className="py-2 pr-4">
											<span
												className={`px-2 py-1 rounded text-xs ${
													r.status === "verified"
														? "bg-emerald-100 text-emerald-700"
														: r.status ===
														  "suspicious"
														? "bg-amber-100 text-amber-700"
														: r.status === "fake"
														? "bg-rose-100 text-rose-700"
														: "bg-slate-100 text-slate-700"
												}`}
											>
												{r.status || "pending"}
											</span>
										</td>
										<td className="py-2 pr-4">
											{r.createdAt
												? new Date(
														r.createdAt
												  ).toLocaleString()
												: "—"}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			<div className="card">
				<div className="flex items-center justify-between">
					<h2 className="font-medium">Raw Stats</h2>
					<button
						className="btn"
						onClick={() => setShowRaw((s) => !s)}
					>
						{showRaw ? "Hide" : "Show"}
					</button>
				</div>
				{showRaw && (
					<pre className="mt-3 text-sm overflow-auto">
						{stats ? JSON.stringify(stats, null, 2) : "Loading…"}
					</pre>
				)}
			</div>
		</div>
	);
}
