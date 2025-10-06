import React from "react";
import { Link } from "react-router-dom";

 const AppFooter = () => (
	<footer className="max-w-7xl w-full mx-auto px-6 py-10 border-t border-gray-200 mt-20 text-center text-gray-500">
		<p>&copy; {new Date().getFullYear()} ValidX. All rights reserved.</p>
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
);

export default AppFooter