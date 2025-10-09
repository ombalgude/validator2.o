import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Button from "../components/Button";
import axios from "axios";
import {
	ShieldCheck,
	Mail,
	Lock,
	LogIn,
	Loader,
	AlertTriangle,
	University,
	FileUp,
	ShieldAlert,
} from "lucide-react";
import { ParticleCanvas } from "../components/ParticalCanvas";

export default function LoginInstitution() {
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
			const res = await axios.post("/api/auth/login", {
				email: email.trim(),
				password: password.trim(),
			});
			localStorage.setItem("token", res.data.token);
			navigate("/dashboard", { replace: true });
		} catch (err) {
			const msg =
				err.response?.data?.message || err.message || "Login failed";
			setError(msg);
		} finally {
			setLoading(false);
		}
	};
	const Feature = ({ icon: Icon, text }) => (
		<li className="flex items-center gap-3">
			<div className="flex items-center justify-center w-8 h-8 bg-indigo-500 rounded-full">
				<Icon className="w-5 h-5 text-white" />
			</div>
			<span className="text-indigo-100">{text}</span>
		</li>
	);

	return (
		<div className="min-h-screen w-full flex items-center justify-center p-4 font-sans text-white overflow-hidden relative isolate">
			<ParticleCanvas />
			<div className="w-full max-w-4xl flex flex-col md:flex-row rounded-2xl shadow-2xl overflow-hidden z-20">
				{/* Left Panel: Branding & Features */}
				<div className="hidden md:flex flex-col justify-between w-full md:w-1/2 p-8 bg-indigo-600">
					<div>
						<div className="font-extrabold text-3xl flex items-center gap-2 mb-8 text-indigo-300">
							<ShieldCheck className="w-9 h-9" />
							ValidX
						</div>
						<h1 className="text-4xl font-bold leading-tight mb-4 text-white">
							Institution Portal
						</h1>
						<p className="text-indigo-200 leading-relaxed">
							Manage issuances, track verifications, and uphold
							the integrity of your organization's credentials.
						</p>
					</div>
					<ul className="space-y-4">
						<Feature
							icon={FileUp}
							text="Bulk Uploads & Template Management"
						/>
						<Feature
							icon={University}
							text="Role-Based Access Controls"
						/>
						<Feature
							icon={ShieldAlert}
							text="Advanced Fraud Monitoring & Alerts"
						/>
					</ul>
				</div>

				{/* Right Panel: Login Form */}
				<div className="w-full md:w-1/2 p-8 md:p-12 bg-white/10 backdrop-blur-sm border border-l-0 border-zinc-300/50 rounded-2xl rounded-l-none">
					<h2 className="text-3xl font-bold text-white mb-2">
						Portal Access
					</h2>
					<p className="text-gray-400 mb-8">
						Sign in to your institution's account.
					</p>

					<form onSubmit={submit} className="space-y-6">
						<div>
							<label className="block mb-1 text-sm font-medium text-gray-300">
								Institution Email
							</label>
							<div className="relative">
								<Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
								<input
									className="w-full pl-10 pr-3 py-2.5 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors placeholder-gray-500"
									type="email"
									placeholder="admin@university.edu"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
								/>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-300 mb-1">
								Password
							</label>
							<div className="relative">
								<Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
								<input
									className="w-full pl-10 pr-3 py-2.5 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors placeholder-gray-500"
									type="password"
									placeholder="••••••••"
									value={password}
									onChange={(e) =>
										setPassword(e.target.value)
									}
									required
								/>
							</div>
						</div>

						{error && (
							<div className="flex items-center gap-3 bg-rose-900/50 text-rose-300 text-sm p-3 rounded-lg border border-rose-500/30">
								<AlertTriangle className="w-5 h-5" />
								<span>{error}</span>
							</div>
						)}

						<Button
							type="submit"
							className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white text-lg font-semibold py-3 rounded-lg shadow-lg hover:bg-indigo-700 transition-all duration-300 transform hover:-translate-y-0.5 disabled:bg-indigo-800"
							disabled={loading}
						>
							{loading ? (
								<Loader className="animate-spin" />
							) : (
								<LogIn className="w-6 h-6" />
							)}
							<span>
								{loading ? "Signing in…" : "Sign in to Portal"}
							</span>
						</Button>

						<p className="text-xs text-center text-gray-500">
							Not an institution?{" "}
							<Link
								to="/login"
								className="text-indigo-400 hover:underline font-medium"
							>
								Switch to User Login
							</Link>
						</p>
					</form>
				</div>
			</div>
		</div>
	);
}
