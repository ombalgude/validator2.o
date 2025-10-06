import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

const AppHeader = () => (
	<header className="max-w-7xl w-full mx-auto px-6 py-5 flex items-center justify-between gap-8 z-10 relative">
		<div className="font-extrabold text-2xl text-indigo-700 flex items-center gap-2">
			<Link to="/" className="flex items-center gap-2">
				<ShieldCheck className="w-8 h-8" />
				ValidX
			</Link>
		</div>
		<nav className="flex items-center gap-6">
			<Link
				to="/demo"
				className="text-gray-600 hover:text-indigo-700 transition-colors duration-300 font-medium"
			>
				Try Now
			</Link>
			<Link
				to="/pricing"
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
);

export default AppHeader;
