import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import Button from "../components/Button";
import { ParticleCanvas } from "../components/ParticalCanvas";
import {
	ShieldCheck,
	Mail,
	Lock,
	UserPlus,
	Loader,
	AlertTriangle,
	CheckCircle,
} from "lucide-react";

export default function RegisterUser() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
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
			setSuccess("Account created. You can now sign in.");
			setTimeout(() => navigate("/login", { replace: true }), 800);
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
		<div className="min-h-screen w-full flex items-center justify-center p-4 font-sans">
			<ParticleCanvas />
			<div className="w-full max-w-md bg-white/10 backdrop-blur-sm border border-zinc-300/50 rounded-2xl shadow-2xl overflow-hidden z-20">
				<div className="p-8 md:p-12">
					<div className="text-center mb-8">
						<div className="font-extrabold text-3xl text-indigo-400 flex items-center justify-center gap-2 mb-2">
							<ShieldCheck size={36} />
							ValidX
						</div>
						<h2 className="text-2xl font-bold text-white">
							Create Your Account
						</h2>
						<p className="text-gray-400 mt-2">
							Join us to start verifying with confidence.
						</p>
					</div>

					<form onSubmit={submit} className="space-y-6">
						<div>
							<label className="block mb-1 text-sm font-medium text-gray-300">
								Email
							</label>
							<div className="relative">
								<Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
								<input
									className="w-full pl-10 pr-3 py-2.5 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors placeholder-gray-500"
									type="email"
									placeholder="you@example.com"
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
							className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white text-lg font-semibold py-3 rounded-lg shadow-lg hover:bg-indigo-700 transition-all duration-300 transform hover:-translate-y-0.5 disabled:bg-indigo-800 disabled:cursor-not-allowed"
							disabled={loading}
						>
							{loading ? (
								<Loader className="animate-spin" />
							) : (
								<UserPlus />
							)}
							<span>
								{loading
									? "Creating Account…"
									: "Create Account"}
							</span>
						</Button>

						<p className="text-sm text-center text-gray-400">
							Already have an account?{" "}
							<Link
								to="/login"
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
