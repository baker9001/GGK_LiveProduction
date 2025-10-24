import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'crypto': 'crypto-browserify',
      'buffer': 'buffer',
      'stream': 'stream-browserify',
      'process': 'process/browser',
    },
  },
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  optimizeDeps: {
    include: ["pdfjs-dist", "react", "react-dom", "buffer"]
  },
});