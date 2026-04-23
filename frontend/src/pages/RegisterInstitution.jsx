import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import {
	AlertTriangle,
	CheckCircle,
	Loader,
	Lock,
	Mail,
	University,
	User,
	UserPlus,
} from "lucide-react";
import { ParticleCanvas } from "../components/ParticalCanvas";
import useAuth from "../hooks/useAuth";
import { getDefaultRouteForRole, SIGNUP_ROLE_OPTIONS } from "../lib/roles";

function getErrorMessage(error, fallback) {
	return error?.response?.data?.message || error?.message || fallback;
}

export default function RegisterInstitution() {
	const organizationRoleOptions = SIGNUP_ROLE_OPTIONS;
	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [role, setRole] = useState("institution_admin");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const navigate = useNavigate();
	const { register } = useAuth();
	const selectedRole =
		organizationRoleOptions.find((option) => option.value === role) ||
		organizationRoleOptions[0];

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
		<div className="min-h-screen w-full flex items-center justify-center p-4 font-sans text-white overflow-hidden relative isolate">
			<div
				className="absolute inset-0 w-full h-full bg-[#111827] -z-20"
				style={{
					background:
						"radial-gradient(ellipse at 50% 50%, #1f2937, #111827)",
				}}
			/>
			<ParticleCanvas />

			<div className="w-full max-w-md bg-white/10 backdrop-blur-sm border border-zinc-500/50 rounded-2xl shadow-2xl overflow-hidden z-20">
				<div className="p-8 md:p-12">
					<div className="text-center mb-8">
						<div className="font-extrabold text-3xl text-indigo-400 flex items-center justify-center gap-2 mb-2">
							<University size={36} />
							ValidX
						</div>
						<h2 className="text-2xl font-bold text-white">
							Register for Organization Access
						</h2>
						<p className="text-gray-400 mt-2">
							Choose an admin role now. Institution, university, or company
							scope becomes active after the matching access profile is assigned.
						</p>
					</div>

					<div className="mb-6 rounded-xl border border-indigo-400/30 bg-indigo-500/10 p-4 text-sm text-indigo-100">
						<div className="flex items-start gap-3">
							<CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-indigo-300" />
							<span>
								Signups now store your requested admin role immediately, but the
								organization profile still controls which records you can act on.
							</span>
						</div>
					</div>

					<form onSubmit={submit} className="space-y-6">
						<div>
							<label className="block mb-1 text-sm font-medium text-gray-300">
								Contact Name
							</label>
							<div className="relative">
								<User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
								<input
									className="w-full pl-10 pr-3 py-2.5 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors placeholder-gray-500"
									type="text"
									placeholder="Institution contact"
									value={fullName}
									onChange={(event) => setFullName(event.target.value)}
								/>
							</div>
						</div>

						<div>
							<label className="block mb-1 text-sm font-medium text-gray-300">
								Organization Email
							</label>
							<div className="relative">
								<Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
								<input
									className="w-full pl-10 pr-3 py-2.5 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors placeholder-gray-500"
									type="email"
									placeholder="admin@organization.com"
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
								Admin Role
							</label>
							<select
								className="w-full rounded-lg border border-gray-600 bg-transparent px-3 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
								value={role}
								onChange={(event) => setRole(event.target.value)}
							>
								{organizationRoleOptions.map((option) => (
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
							className="w-full justify-center bg-indigo-600 text-white text-lg font-semibold py-3 rounded-lg shadow-lg hover:bg-indigo-700 disabled:bg-indigo-800"
							disabled={loading}
						>
							{loading ? <Loader className="animate-spin" /> : <UserPlus className="w-6 h-6" />}
							<span>{loading ? "Creating account..." : "Create Organization Account"}</span>
						</Button>

						<p className="text-sm text-center text-gray-400">
							Already registered?{" "}
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
