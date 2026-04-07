import React from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { formatRoleLabel, getDefaultRouteForRole } from "../lib/roles";

export default function Navbar() {
	const { logout, user } = useAuth();

	return (
		<div className="border-b bg-white px-4 py-3">
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div>
					<div className="font-semibold text-slate-900">Authenticity Validator</div>
					<div className="text-sm text-slate-500">
						{user?.fullName || user?.email}
						{user?.role ? ` | ${formatRoleLabel(user.role)}` : ""}
					</div>
				</div>
				<div className="flex items-center gap-3">
					<Link
						className="text-sm text-slate-600 hover:text-slate-900"
						to={getDefaultRouteForRole(user?.role)}
					>
						Home
					</Link>
					<Link
						className="text-sm text-slate-600 hover:text-slate-900"
						to="/certificates"
					>
						Certificates
					</Link>
					<button className="btn" onClick={logout}>
						Logout
					</button>
				</div>
			</div>
		</div>
	);
}
