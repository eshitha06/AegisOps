/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          darkest: '#111827',
          dark: '#172033',
          card: '#1f2937',
          border: '#334155',
          primary: '#38bdf8',
          accent: '#94a3b8',
          success: '#34d399',
          warning: '#fbbf24',
          danger: '#fb7185'
        }
      }
    },
  },
  plugins: [],
}
