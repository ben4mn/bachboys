/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef4ff',
          100: '#d9e5ff',
          200: '#bcd0ff',
          300: '#8eb3ff',
          400: '#5988ff',
          500: '#3366ff',
          600: '#2563eb',
          700: '#1a4fd4',
          800: '#1a3fac',
          900: '#1b3788',
          950: '#142252',
        },
        glass: {
          white: 'rgba(255, 255, 255, 0.72)',
          border: 'rgba(255, 255, 255, 0.20)',
        },
      },
      fontFamily: {
        sans: ['"SF Pro Display"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        glass: '0 4px 30px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}
