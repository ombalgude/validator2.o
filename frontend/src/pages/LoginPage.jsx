import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const navigate = useNavigate();
	const url = "http://localhost:5000/api";

	const submit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError("");
    try {
            const res = await axios.post('/api/auth/login', { email, password });
            localStorage.setItem('token', res.data.token);
            navigate('/dashboard', { replace: true });
    } catch (err) {
            const msg = err.response?.data?.message || err.message || "An error occurred. Please try again.";
            setError(msg);
    } finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
			<div className="max-w-6xl px-6 pt-10 mx-auto">
				<div className="flex items-center justify-between">
					<div className="text-lg font-semibold">
						Authenticity Validator
					</div>
					<div className="text-sm text-slate-600">
						New here? Ask your institution for access
					</div>
				</div>
			</div>

			<div className="max-w-6xl px-6 py-12 mx-auto">
				<div className="grid items-center grid-cols-1 gap-8 md:grid-cols-2">
					<div className="order-2 md:order-1">
						<div className="mb-6">
							<h1 className="text-3xl font-bold leading-tight md:text-4xl">
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
									<label className="block mb-1 text-sm text-slate-600">
										Email
									</label>
									<input
										className="w-full px-3 py-2 border rounded"
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
									<label className="block mb-1 text-sm text-slate-600">
										Password
									</label>
									<input
										className="w-full px-3 py-2 border rounded"
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
									<div className="text-sm text-red-600">
										{error}
									</div>
								)}
								<button
									className="w-full btn"
									disabled={loading}
								>
									{loading ? "Signing in…" : "Sign in"}
								</button>
								<div className="text-xs text-center text-slate-500">
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

						<div className="grid grid-cols-1 gap-3 mt-6 sm:grid-cols-3">
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
						<div className="p-6 bg-white border shadow rounded-xl">
							<div className="flex items-center justify-center w-full rounded aspect-video bg-gradient-to-br from-indigo-100 via-white to-purple-100">
								<div className="text-center">
									<div className="text-sm text-slate-500">
										Preview
									</div>
									<div className="mt-1 text-2xl font-semibold">
										Verify with confidence
									</div>
								</div>
							</div>
							<ul className="mt-6 space-y-2 text-sm disc-list text-slate-600">
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
