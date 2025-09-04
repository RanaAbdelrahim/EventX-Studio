/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#6EE7B7',
          dark: '#111315'
        }
      }
    }
  },
  plugins: []
}
