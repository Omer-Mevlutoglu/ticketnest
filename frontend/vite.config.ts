import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Keep local API calls same-origin so session and CSRF cookies behave
      // exactly like production. This also avoids OS-specific localhost
      // resolution differences between the browser and the Node server.
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/readyz": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      // `@` is the src root. Added after moving context/ and assets/ inside
      // src, so imports stop climbing out of the tree with `../../../`.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
