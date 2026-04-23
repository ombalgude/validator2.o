import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import { ParticleCanvas } from "../components/ParticalCanvas";
import {
	AlertTriangle,
	Loader,
	Lock,
	Mail,
	ShieldCheck,
	User,
	UserPlus,
} from "lucide-react";
import useAuth from "../hooks/useAuth";
import { getDefaultRouteForRole, SIGNUP_ROLE_OPTIONS } from "../lib/roles";

function getErrorMessage(error, fallback) {
	return error?.response?.data?.message || error?.message || fallback;
}

export default function RegisterUser() {
	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [role, setRole] = useState("company_admin");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const navigate = useNavigate();
	const { register } = useAuth();
	const selectedRole =
		SIGNUP_ROLE_OPTIONS.find((option) => option.value === role) ||
		SIGNUP_ROLE_OPTIONS[0];

	async function submit(event) {
		event.preventDefault();
		setLoading(true);
		setError("");

		try {
			const currentUser = await register({
				fullName: fullName.trim(),
				email: email.trim(),
				password,
				role,
			});

			navigate(getDefaultRouteForRole(currentUser?.role, currentUser), {
				replace: true,
			});
		} catch (requestError) {
			setError(getErrorMessage(requestError, "Registration failed."));
		} finally {
			setLoading(false);
		}
	}

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
						<h2 className="text-2xl font-bold text-white">Create Your Account</h2>
						<p className="text-gray-400 mt-2">
							Choose the workspace role you want at signup. Organization-specific
							scope becomes active after the related backend access profile is assigned.
						</p>
					</div>

					<form onSubmit={submit} className="space-y-6">
						<div>
							<label className="block mb-1 text-sm font-medium text-gray-300">
								Full Name
							</label>
							<div className="relative">
								<User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
								<input
									className="w-full pl-10 pr-3 py-2.5 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors placeholder-gray-500"
									type="text"
									placeholder="Asha Patil"
									value={fullName}
									onChange={(event) => setFullName(event.target.value)}
								/>
							</div>
						</div>

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
									onChange={(event) => setEmail(event.target.value)}
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
									placeholder="At least 8 characters"
									value={password}
									onChange={(event) => setPassword(event.target.value)}
									required
									minLength={8}
								/>
							</div>
						</div>

						<div>
							<label className="block mb-1 text-sm font-medium text-gray-300">
								Signup Role
							</label>
							<select
								className="w-full rounded-lg border border-gray-600 bg-transparent px-3 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
								value={role}
								onChange={(event) => setRole(event.target.value)}
							>
								{SIGNUP_ROLE_OPTIONS.map((option) => (
									<option
										key={option.value}
										value={option.value}
										className="bg-slate-900 text-white"
									>
										{option.label}
									</option>
								))}
							</select>
							<p className="mt-2 text-sm text-gray-400">
								{selectedRole?.description}
							</p>
						</div>

						{error ? (
							<div className="flex items-center gap-3 bg-rose-900/50 text-rose-300 text-sm p-3 rounded-lg border border-rose-500/30">
								<AlertTriangle className="w-5 h-5" />
								<span>{error}</span>
							</div>
						) : null}

						<Button
							type="submit"
							className="w-full justify-center bg-indigo-600 text-white text-lg font-semibold py-3 rounded-lg shadow-lg hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed"
							disabled={loading}
						>
							{loading ? <Loader className="animate-spin" /> : <UserPlus />}
							<span>{loading ? "Creating account..." : "Create Account"}</span>
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
