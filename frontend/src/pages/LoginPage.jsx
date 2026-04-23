import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import {
	AlertTriangle,
	Loader,
	Lock,
	LogIn,
	Mail,
	ShieldCheck,
} from "lucide-react";
import { ParticleCanvas } from "../components/ParticalCanvas";
import useAuth from "../hooks/useAuth";
import { getDefaultRouteForRole } from "../lib/roles";

function getErrorMessage(error, fallback) {
	return error?.response?.data?.message || error?.message || fallback;
}

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const navigate = useNavigate();
	const { login } = useAuth();

	async function submit(event) {
		event.preventDefault();
		setLoading(true);
		setError("");

		try {
			const currentUser = await login({
				email: email.trim(),
				password,
			});

			navigate(getDefaultRouteForRole(currentUser?.role, currentUser), {
				replace: true,
			});
		} catch (requestError) {
			setError(
				getErrorMessage(
					requestError,
					"Unable to sign in right now. Please try again."
				)
			);
		} finally {
			setLoading(false);
		}
	}

	const Feature = ({ icon: Icon, text }) => (
		<li className="flex items-center gap-3">
			<div className="flex items-center justify-center w-8 h-8 bg-indigo-500 rounded-full">
				<Icon className="w-5 h-5 text-white" />
			</div>
			<span className="text-indigo-100">{text}</span>
		</li>
	);

	return (
		<div className="min-h-screen w-full flex items-center justify-center p-4 font-sans">
			<ParticleCanvas />
			<div className="w-full max-w-4xl flex flex-col md:flex-row bg-white/10 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
				<div className="w-full md:w-1/2 p-8 md:p-12 rounded-2xl rounded-r-none border border-r-0 border-zinc-300/50">
					<h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
					<p className="text-gray-400 mb-8">
						Sign in to load your session, sync your access profile, and continue
						from your role-specific workspace.
					</p>

					<form onSubmit={submit} className="space-y-6">
						<div>
							<label className="block mb-1 text-sm font-medium text-gray-400">
								Email
							</label>
							<div className="relative">
								<Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
								<input
									className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
									type="email"
									placeholder="you@example.com"
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									required
								/>
							</div>
						</div>

						<div>
							<label className="block mb-1 text-sm font-medium text-gray-400">
								Password
							</label>
							<div className="relative">
								<Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
								<input
									className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
									type="password"
									placeholder="********"
									value={password}
									onChange={(event) => setPassword(event.target.value)}
									required
								/>
							</div>
						</div>

						{error ? (
							<div className="flex items-center gap-3 bg-red-50 text-red-700 text-sm p-3 rounded-lg">
								<AlertTriangle className="w-5 h-5" />
								<span>{error}</span>
							</div>
						) : null}

						<Button
							type="submit"
							className="w-full justify-center bg-indigo-600 text-white text-lg font-semibold py-3 rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-indigo-400"
							disabled={loading}
						>
							<span>{loading ? "Signing in..." : "Sign in"}</span>
							{loading ? <Loader className="animate-spin" /> : <LogIn className="w-6 h-6" />}
						</Button>

						<p className="text-sm text-center text-gray-500">
							Need an account?{" "}
							<Link
								to="/register"
								className="text-indigo-400 hover:underline font-medium"
							>
								Create one
							</Link>
						</p>
					</form>
				</div>

				<div className="hidden md:flex flex-col justify-between w-full md:w-1/2 p-8 bg-indigo-600 text-white">
					<div>
						<div className="font-extrabold text-3xl flex items-center gap-2 mb-8">
							<ShieldCheck className="w-9 h-9" />
							ValidX
						</div>
						<h1 className="text-4xl font-bold leading-tight mb-4">
							Unlock the Power of Trust.
						</h1>
						<p className="text-indigo-200 leading-relaxed">
							Use the same authentication flow across users, company admins, and
							institution or university admin teams.
						</p>
					</div>
					<ul className="space-y-4">
						<Feature icon={ShieldCheck} text="JWT-backed private sessions" />
						<Feature icon={LogIn} text="Role-based workspace routing" />
						<Feature icon={Mail} text="Live status updates after sign-in" />
					</ul>
				</div>
			</div>
		</div>
	);
}
