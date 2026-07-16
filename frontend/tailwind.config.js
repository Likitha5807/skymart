// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Cinzel", "serif"],
        sans: ["Plus Jakarta Sans", "Poppins", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
