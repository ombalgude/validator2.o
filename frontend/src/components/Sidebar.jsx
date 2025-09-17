import React from "react";
import { Link } from "react-router-dom";

export default function Sidebar() {
	return (
		<div className="w-56 border-r bg-white p-4 space-y-2">
			<Link
				className="block px-2 py-2 rounded hover:bg-slate-100"
				to="/dashboard"
			>
				Overview
			</Link>
			<Link
				className="block px-2 py-2 rounded hover:bg-slate-100"
				to="/certificates"
			>
				Certificates
			</Link>
			<Link
				className="block px-2 py-2 rounded hover:bg-slate-100"
				to="/upload"
			>
				Upload
			</Link>
		</div>
	);
}
