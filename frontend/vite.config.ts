// frontend/vite.config.ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "url";
import path from "path";

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "/",

  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react-router-dom"],
  },

  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "lucide-react"],
    force: true,
    esbuildOptions: {
      target: "es2020",
    },
  },

  server: {
    port: 3010,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
    },
    watch: {
      usePolling: true,
    },
    hmr: {
      overlay: true,
    },
  },

  // ✅ ADD THIS PREVIEW SECTION
  preview: {
    host: "0.0.0.0",
    port: 10000,
    allowedHosts: ["skymart-h-frontend.onrender.com", "localhost", "127.0.0.1"],
  },

  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "terser",
    target: "es2020",
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("react-router-dom")
            ) {
              return "react-vendor";
            }
            if (id.includes("lucide-react")) {
              return "icons-vendor";
            }
            if (id.includes("leaflet")) {
              return "map-vendor";
            }
            if (id.includes("socket.io")) {
              return "socket-vendor";
            }
            return "vendor";
          }
        },
      },
    },
  },

  esbuild: {
    target: "es2020",
  },

  css: {
    modules: {
      localsConvention: "camelCase",
    },
    postcss: {
      plugins: [
        // Use dynamic import for ES modules
        (await import("tailwindcss")).default,
        (await import("autoprefixer")).default,
      ],
    },
  },
});
