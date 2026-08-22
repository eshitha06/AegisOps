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
          darkest: '#09090b',
          dark: '#151518',
          card: '#1d1d21',
          border: '#35353c',
          primary: '#e33b45',
          accent: '#a1a1aa',
          success: '#42a56b',
          warning: '#d59a3a',
          danger: '#e33b45'
        }
      }
    },
  },
  plugins: [],
}
