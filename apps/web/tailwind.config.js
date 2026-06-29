/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"]
      },
      boxShadow: {
        panel: "0 1px 2px rgba(24, 24, 27, 0.08), 0 10px 28px rgba(24, 24, 27, 0.05)"
      }
    }
  },
  plugins: []
};
