import React from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import {
	canAccessDashboard,
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
					Trusted Uploads
				</Link>
			) : null}
			<Link
				className="block px-2 py-2 rounded hover:bg-slate-100"
				to="/demo"
			>
				OCR Demo
			</Link>
		</div>
	);
}
