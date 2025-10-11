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
        // Brand color palette - Go Green Knowledge
        brand: {
          'light-green': '#99C93B',
          'primary': '#99C93B', // Primary Light Green (RGB 153, 201, 59)
          'dark-green': '#5D7E23',
          'secondary': '#5D7E23', // Primary Dark Green (RGB 93, 126, 35)
          'black': '#000000',
          'white': '#FFFFFF',
          'blue-gray': '#B2CACE', // Light Blue-Gray (RGB 178, 202, 206)
          'accent': '#B2CACE',
          // Tints and shades for UI states
          50: '#F5FAE8',
          100: '#E8F5DC',
          200: '#D4EBBA',
          300: '#BFE197',
          400: '#AAD775',
          500: '#99C93B',
          600: '#7AB635',
          700: '#5D7E23',
          800: '#4A6520',
          900: '#394C1A',
          950: '#283413',
        },
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar')({ nocompatible: true }),
  ],
}