import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import { fileURLToPath, URL } from "node:url"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    // Priorité .jsx avant .tsx — pour éviter les conflits entre anciens .tsx et nouveaux .jsx
    extensions: [".mjs", ".js", ".jsx", ".ts", ".tsx", ".json"],
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8011", // Backend local (FastAPI) sur 8011
        changeOrigin: true,
        
      },
    },
  },
})
