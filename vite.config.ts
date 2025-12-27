import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',  // Ensure assets are loaded from root
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
    include: ["pdfjs-dist", "react-pdf", "react", "react-dom", "buffer"]
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress eval warnings from pdf.js and ScientificEditor
        if (warning.code === 'EVAL' && (
          warning.id?.includes('pdfjs-dist') ||
          warning.id?.includes('ScientificEditor')
        )) {
          return;
        }
        warn(warning);
      },
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'pdf-libs': ['pdfjs-dist', 'react-pdf'],
          'ui-components': ['lucide-react'],
          'query': ['@tanstack/react-query'],
          'supabase': ['@supabase/supabase-js'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  }
});