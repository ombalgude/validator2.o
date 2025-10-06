import React from "react";

function Button({ className, children, ...rest }) {
	const baseStyles =
		"flex items-center text-center gap-2 px-8 py-4 bg-indigo-600 text-lg font-semibold rounded-xl shadow-lg transition-all duration-300 transform hover:-translate-y-1 hover:scale-[102%]";
	const combinedStyles = `${baseStyles} ${className || ""}`;

	return (
		<button className={combinedStyles} {...rest}>
			{children}
		</button>
	);
}

export default Button;
