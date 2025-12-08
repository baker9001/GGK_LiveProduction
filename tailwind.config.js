// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // System Brand Colors - Always use these for primary actions and highlights
        brand: {
          primary: '#8CC63F',      // Main green - Use for primary buttons, active states
          'primary-dark': '#7AB635', // Darker green - Use for hover states
          'primary-light': '#9AD74F', // Lighter green - Use for subtle backgrounds
        },
        // Alias 'primary' to brand colors for easier usage
        primary: {
          DEFAULT: '#8CC63F',
          50: '#F0F9E8',
          100: '#E1F3D1',
          200: '#C9E8A7',
          300: '#B1DD7D',
          400: '#9AD74F',
          500: '#8CC63F',
          600: '#7AB635',
          700: '#5F8F29',
          800: '#47691E',
          900: '#2F4414',
        },
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar')({ nocompatible: true }),
  ],
}