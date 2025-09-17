/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./index.html", "./src/**/*.{js,jsx}"],
	theme: {
		extend: {
			fontFamily: {
				"product-sans": ["Product Sans"],
				"product-sans-light": ["Product Sans Light"],
				"product-sans-bold": ["Product Sans Bold"],
				"product-sans-italic": ["Product Sans Italic"],
				"product-sans-bold-italic": ["Product Sans Bold Italic"],
				"product-sans-bold-medium": ["Product Sans Bold Medium"],
			},
		},
	},
	plugins: [],
};
