import React from "react";
import { Link } from "react-router-dom";

export default function Navbar({ onLogout }) {
	return (
		<div className="h-14 border-b bg-white flex items-center justify-between px-4">
			<div className="font-semibold">Authenticity Validator</div>
			<div className="flex items-center gap-3">
				<Link
					className="text-sm text-slate-600 hover:text-slate-900"
					to="/dashboard"
				>
					Dashboard
				</Link>
				<button className="btn" onClick={onLogout}>
					Logout
				</button>
			</div>
		</div>
	);
}
