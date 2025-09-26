import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const navigate = useNavigate();

	const submit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError("");
		try {
			const data = await AuthAPI.login(email.trim(), password.trim());
			setToken(data.token);
			navigate("/dashboard", { replace: true });
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
			<div className="max-w-6xl mx-auto px-6 pt-10">
				<div className="flex items-center justify-between">
					<div className="font-semibold text-lg">
						Authenticity Validator
					</div>
					<div className="text-sm text-slate-600">
						New here? Ask your institution for access
					</div>
				</div>
			</div>

			<div className="max-w-6xl mx-auto px-6 py-12">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
					<div className="order-2 md:order-1">
						<div className="mb-6">
							<h1 className="text-3xl md:text-4xl font-bold leading-tight">
								Welcome back
							</h1>
							<p className="mt-2 text-slate-600">
								Sign in to verify or manage academic
								certificates.
							</p>
						</div>

						<div className="card">
							<form onSubmit={submit} className="space-y-4">
								<div>
									<label className="block text-sm text-slate-600 mb-1">
										Email
									</label>
									<input
										className="w-full border rounded px-3 py-2"
										type="email"
										placeholder="you@example.com"
										value={email}
										onChange={(e) =>
											setEmail(e.target.value)
										}
										required
									/>
								</div>
								<div>
									<label className="block text-sm text-slate-600 mb-1">
										Password
									</label>
									<input
										className="w-full border rounded px-3 py-2"
										type="password"
										placeholder="••••••••"
										value={password}
										onChange={(e) =>
											setPassword(e.target.value)
										}
										required
									/>
								</div>
								{error && (
									<div className="text-red-600 text-sm">
										{error}
									</div>
								)}
								<Button
									className="w-full h-full "
									disabled={loading}
								>
									<span className="text-lg font-medium">
										{loading ? "Signing in…" : "Sign in"}
									</span>
								</Button>
								<div className="text-xs text-slate-500 text-center">
									Institution staff? Use the{" "}
									<a
										className="underline"
										href="/login-institution"
									>
										institution login
									</a>
									.
								</div>
							</form>
						</div>

						<div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
							<div className="p-4 rounded bg-blue-50">
								<div className="text-xs text-slate-600">
									Trusted
								</div>
								<div className="text-lg font-semibold">
									250+ orgs
								</div>
							</div>
							<div className="p-4 rounded bg-emerald-50">
								<div className="text-xs text-slate-600">
									Fast checks
								</div>
								<div className="text-lg font-semibold">~6s</div>
							</div>
							<div className="p-4 rounded bg-amber-50">
								<div className="text-xs text-slate-600">
									High accuracy
								</div>
								<div className="text-lg font-semibold">98%</div>
							</div>
						</div>
					</div>

					<div className="order-1 md:order-2">
						<div className="rounded-xl border bg-white p-6 shadow">
							<div className="aspect-video w-full rounded bg-gradient-to-br from-indigo-100 via-white to-purple-100 flex items-center justify-center">
								<div className="text-center">
									<div className="text-sm text-slate-500">
										Preview
									</div>
									<div className="text-2xl font-semibold mt-1">
										Verify with confidence
									</div>
								</div>
							</div>
							<ul className="disc-list mt-6 space-y-2 text-sm text-slate-600">
								<li>• OCR extraction and field validation</li>
								<li>• Tamper and anomaly detection</li>
								<li>• Real-time status updates</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
