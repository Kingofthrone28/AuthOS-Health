/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        sidebar: {
          bg: "#1a2035",
          hover: "#243049",
          active: "#2d3d5a",
          border: "#2a3550",
        },
      },
    },
  },
  plugins: [],
};
