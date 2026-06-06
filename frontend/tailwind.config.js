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
          darkest: '#070a13', // Deepest canvas background
          dark: '#0e1322',    // Primary card/surface
          card: '#171e30',    // Secondary card/modal
          border: '#242e47',  // Custom borders
          primary: '#0ea5e9', // Vibrant primary cyan
          accent: '#a855f7',  // Secondary accent purple
          success: '#10b981', // Clean system success green
          warning: '#f59e0b', // Clean system warning orange
          danger: '#ef4444'   // Clean system critical red
        }
      }
    },
  },
  plugins: [],
}
