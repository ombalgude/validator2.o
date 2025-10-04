import React from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button"; // Assuming your Button component is styled well
import {
	ShieldCheck,
	CloudUpload,
	ScrollText,
	Clock,
	University,
	Zap,
	EyeOff,
	BellRing,
} from "lucide-react"; // Lucide icons

export default function Landing() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 font-product-sans antialiased text-gray-800">
			{/* Header */}
			<header className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between z-10 relative">
				<div className="font-extrabold text-2xl text-indigo-700 flex items-center gap-2">
					<ShieldCheck className="w-8 h-8" />
					ValidX
				</div>
				<nav className="flex items-center gap-6">
					<Link
						to="/demo"
						className="text-gray-600 hover:text-indigo-700 transition-colors duration-300 font-medium"
					>
						Try Now
					</Link>
					<Link
						to="/features"
						className="text-gray-600 hover:text-indigo-700 transition-colors duration-300 font-medium"
					>
						Features
					</Link>
					<Link
						to="/about"
						className="text-gray-600 hover:text-indigo-700 transition-colors duration-300 font-medium"
					>
						Pricing
					</Link>
					<Link
						to="/contact"
						className="text-gray-600 hover:text-indigo-700 transition-colors duration-300 font-medium"
					>
						Contact
					</Link>
					<Link
						to="/login"
						className="px-5 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105 font-medium"
					>
						Sign In
					</Link>
				</nav>
			</header>

			{/* Main Hero Section */}
			<main className="max-w-7xl mx-auto px-6 py-20 md:py-32 relative">
				{/* Background blobs for visual interest */}
				<div className="absolute top-1/4 left-0 w-64 h-64 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
				<div className="absolute top-1/2 right-0 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-0">
					{/* Hero Content */}
					<div className="animate-fade-in-up">
						<h1 className="text-5xl md:text-6xl font-extrabold leading-tight text-gray-900 drop-shadow-sm">
							Verify academic certificates{" "}
							<span className="text-indigo-600">
								with confidence
							</span>
						</h1>
						<p className="mt-6 text-lg text-gray-600 leading-relaxed">
							Leverage AI-powered OCR and tamper detection for
							unparalleled accuracy. Enjoy real-time status
							updates and streamlined workflows for institutions.
						</p>
						<div className="mt-10 flex flex-col sm:flex-row gap-4">
							<Link to="/demo" className="inline-block">
								<Button className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white text-lg font-semibold rounded-xl shadow-lg hover:bg-indigo-700 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
									<CloudUpload className="w-6 h-6" />
									Verify a Certificate
								</Button>
							</Link>
							<Link
								to="/institution-portal"
								className="inline-block"
							>
								<Button className="flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 border border-indigo-300 text-lg font-semibold rounded-xl shadow-lg hover:bg-indigo-50 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
									<University className="w-6 h-6" />
									Institution Portal
								</Button>
							</Link>
						</div>
					</div>

					{/* Hero Image/Stats Card */}
					<div className="relative p-8 bg-white rounded-3xl shadow-xl border border-gray-100 transform rotate-3 hover:rotate-0 transition-transform duration-500 ease-in-out animate-fade-in-right">
						{/* You can replace this with an actual product screenshot for better impact */}
						<div className="relative w-full h-72 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mb-6 overflow-hidden">
							<img
								src="https://via.placeholder.com/400x300/6366f1/ffffff?text=Product+Dashboard"
								alt="Product Dashboard"
								className="object-cover w-full h-full transform scale-105 transition-transform duration-500 ease-in-out hover:scale-100"
							/>
							<div className="absolute top-4 right-4 text-sm text-gray-500 bg-white bg-opacity-70 px-3 py-1 rounded-full backdrop-blur-sm">
								Live Demo
							</div>
						</div>

						<div className="grid grid-cols-2 gap-6 text-center">
							<div className="p-4 rounded-xl bg-blue-50 border border-blue-100 shadow-sm animate-bounce-in">
								<div className="text-sm font-medium text-blue-600">
									Daily Verifications
								</div>
								<div className="text-3xl font-bold text-blue-800 mt-1">
									1,250+
								</div>
							</div>
							<div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 shadow-sm animate-bounce-in animation-delay-100">
								<div className="text-sm font-medium text-emerald-600">
									Accuracy
								</div>
								<div className="text-3xl font-bold text-emerald-800 mt-1">
									99.8%
								</div>{" "}
								{/* Improved accuracy */}
							</div>
							<div className="p-4 rounded-xl bg-amber-50 border border-amber-100 shadow-sm animate-bounce-in animation-delay-200">
								<div className="text-sm font-medium text-amber-600">
									Avg. Time
								</div>
								<div className="text-3xl font-bold text-amber-800 mt-1">
									~5s
								</div>{" "}
								{/* Faster time */}
							</div>
							<div className="p-4 rounded-xl bg-rose-50 border border-rose-100 shadow-sm animate-bounce-in animation-delay-300">
								<div className="text-sm font-medium text-rose-600">
									Institutions
								</div>
								<div className="text-3xl font-bold text-rose-800 mt-1">
									300+
								</div>{" "}
								{/* More institutions */}
							</div>
						</div>
					</div>
				</div>

				{/* Features Section */}
				<section className="mt-24 md:mt-36 text-center">
					<h2 className="text-4xl font-extrabold text-gray-900 mb-4 animate-fade-in">
						Key Features
					</h2>
					<p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto animate-fade-in animation-delay-500">
						Our cutting-edge technology ensures every certificate's
						authenticity, providing peace of mind.
					</p>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						{/* Feature Cards */}
						{[
							{
								icon: ScrollText,
								title: "Intelligent OCR Extraction",
								desc: "Accurately extracts all relevant fields and validates document structure with AI.",
							},
							{
								icon: EyeOff,
								title: "Advanced Tamper Detection",
								desc: "Flags any unauthorized edits, overlays, font anomalies, and digital alterations.",
							},
							{
								icon: BellRing,
								title: "Real-time Status Updates",
								desc: "Receive instant notifications on verification progress and results via webhooks or polling.",
							},
						].map((f, i) => (
							<div
								key={i}
								className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-2 animate-fade-in-up"
								style={{ animationDelay: `${500 + i * 200}ms` }}
							>
								<div className="p-4 bg-indigo-100 text-indigo-600 rounded-full inline-flex mb-6">
									<f.icon className="w-8 h-8" />
								</div>
								<h3 className="text-xl font-bold text-gray-900 mb-3">
									{f.title}
								</h3>
								<p className="text-gray-600">{f.desc}</p>
							</div>
						))}
					</div>
				</section>

				{/* Call to Action Section */}
				<section className="mt-24 md:mt-36 text-center bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-12 rounded-3xl shadow-2xl animate-fade-in-up animation-delay-1000">
					<h2 className="text-4xl font-extrabold mb-4">
						Ready to Transform Your Verification Process?
					</h2>
					<p className="text-xl opacity-90 mb-8 max-w-3xl mx-auto">
						Join hundreds of institutions and thousands of users who
						trust ValidX for fast, secure, and reliable certificate
						verification.
					</p>
					<div className="flex flex-col sm:flex-row justify-center gap-6">
						<Link to="/register" className="inline-block">
							<Button className="flex items-center gap-2 px-10 py-5 bg-white text-indigo-700 text-xl font-bold rounded-full shadow-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105">
								<Zap className="w-6 h-6" />
								Get Started Free
							</Button>
						</Link>
						<Link to="/contact" className="inline-block">
							<Button className="flex items-center gap-2 px-10 py-5 border-2 border-white text-white text-xl font-bold rounded-full shadow-lg hover:bg-white hover:text-indigo-700 transition-all duration-300 transform hover:scale-105">
								<Clock className="w-6 h-6" />
								Book a Demo
							</Button>
						</Link>
					</div>
				</section>
			</main>

			{/* Footer */}
			<footer className="max-w-7xl mx-auto px-6 py-10 border-t border-gray-200 mt-20 text-center text-gray-500">
				<p>
					&copy; {new Date().getFullYear()} AuthentiCert. All rights
					reserved.
				</p>
				<div className="mt-4 flex justify-center gap-6">
					<Link
						to="/privacy"
						className="text-gray-500 hover:text-indigo-600 transition-colors"
					>
						Privacy Policy
					</Link>
					<Link
						to="/terms"
						className="text-gray-500 hover:text-indigo-600 transition-colors"
					>
						Terms of Service
					</Link>
				</div>
			</footer>
		</div>
	);
}
