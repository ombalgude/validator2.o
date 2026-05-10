import React from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import {
	canAccessDashboard,
	canManageInstituteApprovals,
	canManageUniversityAdminApprovals,
	canUploadTrustedCertificates,
} from "../lib/roles";

export default function Sidebar() {
	const { user } = useAuth();

	return (
		<div className="w-56 border-r bg-white p-4 space-y-2">
			{canAccessDashboard(user?.role) ? (
				<Link
					className="block px-2 py-2 rounded hover:bg-slate-100"
					to="/dashboard"
				>
					Overview
				</Link>
			) : null}
			<Link
				className="block px-2 py-2 rounded hover:bg-slate-100"
				to="/certificates"
			>
				Certificates
			</Link>
			{canUploadTrustedCertificates(user?.role) ? (
				<Link
					className="block px-2 py-2 rounded hover:bg-slate-100"
					to="/upload"
				>
					Upload Certificate
				</Link>
			) : null}
			{canManageUniversityAdminApprovals(user?.role) ? (
				<Link
					className="block px-2 py-2 rounded hover:bg-slate-100"
					to="/university-admin-approvals"
				>
					University Admin Requests
				</Link>
			) : null}
			{canManageInstituteApprovals(user?.role) ? (
				<Link
					className="block px-2 py-2 rounded hover:bg-slate-100"
					to="/institute-approvals"
				>
					Institute Acceptance
				</Link>
			) : null}
		</div>
	);
}
