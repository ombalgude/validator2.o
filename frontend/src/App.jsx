import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";
import PublicRoute from "./components/PublicRoute.jsx";
import Landing from "./pages/Landing.jsx";
import OCRPage from "./pages/OCRPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import LoginInstitution from "./pages/LoginInstitution.jsx";
import RegisterUser from "./pages/RegisterUser.jsx";
import RegisterInstitution from "./pages/RegisterInstitution.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import CertificatesPage from "./pages/Certificates.jsx";
import UploadPage from "./pages/Upload.jsx";

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
			<Route path="/demo" element={<OCRPage />} />

			<Route
				path="/login"
				element={
					<PublicRoute>
						<LoginPage />
					</PublicRoute>
				}
			/>
			<Route
				path="/login-institution"
				element={
					<PublicRoute>
						<LoginInstitution />
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
				path="/register-institution"
				element={
					<PublicRoute>
						<RegisterInstitution />
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
					<ProtectedPage>
						<CertificatesPage />
					</ProtectedPage>
				}
			/>
			<Route
				path="/upload"
				element={
					<ProtectedPage roles={["admin", "institution_admin", "university_admin"]}>
						<UploadPage />
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
