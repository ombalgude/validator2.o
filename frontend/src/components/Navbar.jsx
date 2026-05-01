import React from "react";
import { Link } from "react-router-dom";
import { FileUp } from "lucide-react";
import useAuth from "../hooks/useAuth";
import {
	canUploadTrustedCertificates,
	formatRoleLabel,
	getDefaultRouteForRole,
} from "../lib/roles";

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
						to={getDefaultRouteForRole(user?.role, user)}
					>
						Home
					</Link>
					<Link
						className="text-sm text-slate-600 hover:text-slate-900"
						to="/certificates"
					>
						Certificates
					</Link>
					{canUploadTrustedCertificates(user?.role) ? (
						<Link
							className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
							to="/upload"
						>
							<FileUp className="h-4 w-4" />
							Upload
						</Link>
					) : null}
					<button className="btn" onClick={logout}>
						Logout
					</button>
				</div>
			</div>
		</div>
	);
}
