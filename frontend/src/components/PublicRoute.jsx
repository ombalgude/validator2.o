import React from "react";
import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { getDefaultRouteForRole } from "../lib/roles";

export default function PublicRoute({ children }) {
	const { isAuthenticated, isBootstrapping, user } = useAuth();

	if (isBootstrapping) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
				Loading session...
			</div>
		);
	}

	if (isAuthenticated) {
		return (
			<Navigate
				to={getDefaultRouteForRole(user?.role, user)}
				replace
			/>
		);
	}

	return children;
}
