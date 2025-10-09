import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import Button from "../components/Button";
import {
	ShieldCheck,
	Mail,
	Lock,
	LogIn,
	Loader,
	AlertTriangle,
	University,
	Fingerprint,
	UserPlus,
	CheckCircle,
} from "lucide-react";
import { ParticleCanvas } from "../components/ParticalCanvas";

export default function RegisterInstitution() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [institutionId, setInstitutionId] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const navigate = useNavigate();

	const submit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError("");
		setSuccess("");
		try {
			await axios.post("/api/auth/register", { email, password });
			setSuccess("Institution account created. You can now sign in.");
			setTimeout(
				() => navigate("/login-institution", { replace: true }),
				800
			);
		} catch (err) {
			const msg =
				err.response?.data?.message ||
				err.message ||
				"Registration failed";
			setError(msg);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen w-full flex items-center justify-center p-4 font-sans text-white overflow-hidden relative isolate">
			{/* Background Setup */}
			<div
				className="absolute inset-0 w-full h-full bg-[#111827] -z-20"
				style={{
					background:
						"radial-gradient(ellipse at 50% 50%, #1f2937, #111827)",
				}}
			></div>
			<div
				className="absolute inset-0 w-full h-full -z-10 opacity-[0.03]"
				style={{
					backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 600 600' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
				}}
			></div>
			<ParticleCanvas />

			<div className="w-full max-w-md bg-white/10 backdrop-blur-sm border border-zinc-500/50 rounded-2xl shadow-2xl overflow-hidden z-20">
				<div className="p-8 md:p-12">
					<div className="text-center mb-8">
						<div className="font-extrabold text-3xl text-indigo-400 flex items-center justify-center gap-2 mb-2">
							<University size={36} />
							ValidX
						</div>
						<h2 className="text-2xl font-bold text-white">
							Onboard Your Institution
						</h2>
						<p className="text-gray-400 mt-2">
							Create an account to begin issuing and verifying
							credentials.
						</p>
					</div>

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
							<label className="block mb-1 text-sm font-medium text-gray-300">
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

						<div>
							<label className="block mb-1 text-sm font-medium text-gray-300">
								Institution ID
							</label>
							<div className="relative">
								<Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
								<input
									className="w-full pl-10 pr-3 py-2.5 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors placeholder-gray-500"
									type="text"
									placeholder="Provided by support"
									value={institutionId}
									onChange={(e) =>
										setInstitutionId(e.target.value)
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

						{success && (
							<div className="flex items-center gap-3 bg-emerald-900/50 text-emerald-300 text-sm p-3 rounded-lg border border-emerald-500/30">
								<CheckCircle className="w-5 h-5" />
								<span>{success}</span>
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
								<UserPlus className="w-6 h-6" />
							)}
							<span>
								{loading
									? "Onboarding…"
									: "Create Institution Account"}
							</span>
						</Button>

						<p className="text-sm text-center text-gray-400">
							Already have an account?{" "}
							<Link
								to="/login-institution"
								className="text-indigo-400 hover:underline font-medium"
							>
								Sign In
							</Link>
						</p>
					</form>
				</div>
			</div>
		</div>
	);
}
