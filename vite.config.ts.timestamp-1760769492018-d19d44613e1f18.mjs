// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
var __vite_injected_original_dirname = "/home/project";
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src"),
      "crypto": "crypto-browserify",
      "buffer": "buffer",
      "stream": "stream-browserify",
      "process": "process/browser"
    }
  },
  define: {
    global: "globalThis",
    "process.env": {}
  },
  optimizeDeps: {
    include: ["pdfjs-dist", "react", "react-dom", "buffer"]
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === "EVAL" && (warning.id?.includes("pdfjs-dist") || warning.id?.includes("ScientificEditor"))) {
          return;
        }
        warn(warning);
      },
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "pdf-worker": ["pdfjs-dist"],
          "ui-components": ["lucide-react"],
          "query": ["@tanstack/react-query"],
          "supabase": ["@supabase/supabase-js"]
        }
      }
    },
    chunkSizeWarningLimit: 1e3
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYycpLFxuICAgICAgJ2NyeXB0byc6ICdjcnlwdG8tYnJvd3NlcmlmeScsXG4gICAgICAnYnVmZmVyJzogJ2J1ZmZlcicsXG4gICAgICAnc3RyZWFtJzogJ3N0cmVhbS1icm93c2VyaWZ5JyxcbiAgICAgICdwcm9jZXNzJzogJ3Byb2Nlc3MvYnJvd3NlcicsXG4gICAgfSxcbiAgfSxcbiAgZGVmaW5lOiB7XG4gICAgZ2xvYmFsOiAnZ2xvYmFsVGhpcycsXG4gICAgJ3Byb2Nlc3MuZW52Jzoge30sXG4gIH0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGluY2x1ZGU6IFtcInBkZmpzLWRpc3RcIiwgXCJyZWFjdFwiLCBcInJlYWN0LWRvbVwiLCBcImJ1ZmZlclwiXVxuICB9LFxuICBidWlsZDoge1xuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG9ud2Fybih3YXJuaW5nLCB3YXJuKSB7XG4gICAgICAgIC8vIFN1cHByZXNzIGV2YWwgd2FybmluZ3MgZnJvbSBwZGYuanMgYW5kIFNjaWVudGlmaWNFZGl0b3JcbiAgICAgICAgaWYgKHdhcm5pbmcuY29kZSA9PT0gJ0VWQUwnICYmIChcbiAgICAgICAgICB3YXJuaW5nLmlkPy5pbmNsdWRlcygncGRmanMtZGlzdCcpIHx8XG4gICAgICAgICAgd2FybmluZy5pZD8uaW5jbHVkZXMoJ1NjaWVudGlmaWNFZGl0b3InKVxuICAgICAgICApKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHdhcm4od2FybmluZyk7XG4gICAgICB9LFxuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgICdyZWFjdC12ZW5kb3InOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdyZWFjdC1yb3V0ZXItZG9tJ10sXG4gICAgICAgICAgJ3BkZi13b3JrZXInOiBbJ3BkZmpzLWRpc3QnXSxcbiAgICAgICAgICAndWktY29tcG9uZW50cyc6IFsnbHVjaWRlLXJlYWN0J10sXG4gICAgICAgICAgJ3F1ZXJ5JzogWydAdGFuc3RhY2svcmVhY3QtcXVlcnknXSxcbiAgICAgICAgICAnc3VwYWJhc2UnOiBbJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcyddLFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDEwMDAsXG4gIH1cbn0pOyJdLAogICJtYXBwaW5ncyI6ICI7QUFBeU4sU0FBUyxvQkFBb0I7QUFDdFAsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUZqQixJQUFNLG1DQUFtQztBQUt6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLE1BQ3BDLFVBQVU7QUFBQSxNQUNWLFVBQVU7QUFBQSxNQUNWLFVBQVU7QUFBQSxNQUNWLFdBQVc7QUFBQSxJQUNiO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sUUFBUTtBQUFBLElBQ1IsZUFBZSxDQUFDO0FBQUEsRUFDbEI7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLFNBQVMsQ0FBQyxjQUFjLFNBQVMsYUFBYSxRQUFRO0FBQUEsRUFDeEQ7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLGVBQWU7QUFBQSxNQUNiLE9BQU8sU0FBUyxNQUFNO0FBRXBCLFlBQUksUUFBUSxTQUFTLFdBQ25CLFFBQVEsSUFBSSxTQUFTLFlBQVksS0FDakMsUUFBUSxJQUFJLFNBQVMsa0JBQWtCLElBQ3RDO0FBQ0Q7QUFBQSxRQUNGO0FBQ0EsYUFBSyxPQUFPO0FBQUEsTUFDZDtBQUFBLE1BQ0EsUUFBUTtBQUFBLFFBQ04sY0FBYztBQUFBLFVBQ1osZ0JBQWdCLENBQUMsU0FBUyxhQUFhLGtCQUFrQjtBQUFBLFVBQ3pELGNBQWMsQ0FBQyxZQUFZO0FBQUEsVUFDM0IsaUJBQWlCLENBQUMsY0FBYztBQUFBLFVBQ2hDLFNBQVMsQ0FBQyx1QkFBdUI7QUFBQSxVQUNqQyxZQUFZLENBQUMsdUJBQXVCO0FBQUEsUUFDdEM7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0EsdUJBQXVCO0FBQUEsRUFDekI7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
