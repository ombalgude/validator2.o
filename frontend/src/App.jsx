import React, { useEffect, useState } from "react";
import {
	BrowserRouter,
	Routes,
	Route,
	Navigate,
	Link,
	useNavigate,
} from "react-router-dom";
import "./index.css";
import CertificatesPage from "./pages/Certificates.jsx";
import UploadPage from "./pages/Upload.jsx";
import Landing from "./pages/Landing.jsx";
import LoginInstitution from "./pages/LoginInstitution.jsx";
import RegisterUser from "./pages/RegisterUser.jsx";
import RegisterInstitution from "./pages/RegisterInstitution.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import Layout from "./components/Layout.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";
import OCRPage from "./pages/OCRPage.jsx";

export default function App() {
	const navigate = useNavigate();
	const onLogout = () => {
		setToken("");
		navigate("/login", { replace: true });
	};

	return (
		<Routes>
			<Route path="/" element={<Landing />} />
			<Route path="/demo" element={<OCRPage />} />
			<Route path="/login" element={<LoginPage />} />
			<Route path="/login-institution" element={<LoginInstitution />} />
			<Route path="/register" element={<RegisterUser />} />
			<Route
				path="/register-institution"
				element={<RegisterInstitution />}
			/>
			<Route
				path="/"
				element={
					<PrivateRoute>
						<Layout onLogout={onLogout}>
							<Landing />
						</Layout>
					</PrivateRoute>
				}
			/>
			<Route
				path="/dashboard"
				element={
					<PrivateRoute>
						<Layout onLogout={onLogout}>
							<DashboardPage />
						</Layout>
					</PrivateRoute>
				}
			/>
			<Route
				path="/certificates"
				element={
					<PrivateRoute>
						<Layout onLogout={onLogout}>
							<CertificatesPage />
						</Layout>
					</PrivateRoute>
				}
			/>
			<Route
				path="/upload"
				element={
					<PrivateRoute>
						<Layout onLogout={onLogout}>
							<UploadPage />
						</Layout>
					</PrivateRoute>
				}
			/>
			<Route path="*" element={<Navigate to="/dashboard" replace />} />
		</Routes>
	);
}

export function Root() {
	return (
		<BrowserRouter>
			<App />
		</BrowserRouter>
	);
}
