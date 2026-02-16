/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f5ff",
          100: "#e0eaff",
          200: "#c1d5ff",
          300: "#93b4ff",
          400: "#6490ff",
          500: "#3b6bff",
          600: "#1e4fff",
          700: "#0a3ae6",
          800: "#0d2eb8",
          900: "#112b91",
        },
      },
    },
  },
  plugins: [],
};
