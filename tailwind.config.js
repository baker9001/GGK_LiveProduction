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
        ggk: {
          primary: {
            50: '#f4fae8',
            100: '#e8f5dc',
            200: '#d4edc4',
            300: '#b8e197',
            400: '#9ed050',
            500: '#8CC63F',
            600: '#7AB635',
            700: '#6AA52D',
            800: '#5d7e23',
            900: '#4a6319',
          },
          neutral: {
            0: '#ffffff',
            50: '#fafbfc',
            100: '#f5f7fa',
            200: '#e5e7eb',
            300: '#d1d5db',
            400: '#9ca3af',
            500: '#6b7280',
            600: '#4b5563',
            700: '#374151',
            800: '#1f2937',
            900: '#111827',
            950: '#0a0e14',
          },
        },
      },
      spacing: {
        2: '0.125rem',
        4: '0.25rem',
        6: '0.375rem',
        8: '0.5rem',
        10: '0.625rem',
        12: '0.75rem',
        16: '1rem',
        20: '1.25rem',
        24: '1.5rem',
        32: '2rem',
        40: '2.5rem',
        48: '3rem',
        64: '4rem',
      },
      borderRadius: {
        'ggk-sm': '0.5rem',
        'ggk-md': '0.75rem',
        'ggk-lg': '1rem',
        'ggk-xl': '1.25rem',
        'ggk-2xl': '1.5rem',
      },
      boxShadow: {
        'ggk-xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'ggk-sm': '0 2px 4px 0 rgba(0, 0, 0, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'ggk-md': '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        'ggk-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'ggk-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'ggk-2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
      },
      transitionDuration: {
        'fast': '150ms',
        'base': '200ms',
        'slow': '300ms',
      },
    },
  },
  plugins: [],
}