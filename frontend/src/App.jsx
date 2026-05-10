import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";
import PublicRoute from "./components/PublicRoute.jsx";
import { AUTH_ROLES } from "./lib/roles.js";
import Landing from "./pages/Landing.jsx";
import OCRDemo from "./pages/OCRDemo.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterUser from "./pages/RegisterUser.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import CertificatesPage from "./pages/Certificates.jsx";
import UploadPage from "./pages/Upload.jsx";
import UniversityAdminApprovalsPage from "./pages/UniversityAdminApprovals.jsx";
import InstituteApprovalsPage from "./pages/InstituteApprovals.jsx";

function ProtectedPage({ children, roles }) {
	return (
		<PrivateRoute roles={roles}>
			<Layout>{children}</Layout>
		</PrivateRoute>
	);
}

function App() {
	return (
		<Routes>
			<Route path="/" element={<Landing />} />
			<Route path="/demo" element={<OCRDemo />} />

			<Route
				path="/login"
				element={
					<PublicRoute>
						<LoginPage />
					</PublicRoute>
				}
			/>
			<Route
				path="/register"
				element={
					<PublicRoute>
						<RegisterUser />
					</PublicRoute>
				}
			/>

			<Route
				path="/dashboard"
				element={
					<ProtectedPage roles={["admin"]}>
						<DashboardPage />
					</ProtectedPage>
				}
			/>
			<Route
				path="/certificates"
				element={
					<ProtectedPage roles={AUTH_ROLES}>
						<CertificatesPage />
					</ProtectedPage>
				}
			/>
			<Route path="/certificate" element={<Navigate to="/certificates" replace />} />
			<Route
				path="/upload"
				element={
					<ProtectedPage roles={["admin", "university_admin"]}>
						<UploadPage />
					</ProtectedPage>
				}
			/>
			<Route
				path="/university-admin-approvals"
				element={
					<ProtectedPage roles={["admin"]}>
						<UniversityAdminApprovalsPage />
					</ProtectedPage>
				}
			/>
			<Route
				path="/institute-approvals"
				element={
					<ProtectedPage roles={["admin"]}>
						<InstituteApprovalsPage />
					</ProtectedPage>
				}
			/>

			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}

export function Root() {
	return (
		<BrowserRouter>
			<AuthProvider>
				<App />
			</AuthProvider>
		</BrowserRouter>
	);
}

export default App;
