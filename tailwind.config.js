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
        128: '32rem',
        144: '36rem',
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
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-from-top': {
          '0%': { transform: 'translateY(-0.5rem)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-in-from-top-2': 'slide-in-from-top 0.2s ease-out',
        'pulse': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}