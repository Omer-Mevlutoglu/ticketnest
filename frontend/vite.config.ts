import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // `@` is the src root. Added after moving context/ and assets/ inside
      // src, so imports stop climbing out of the tree with `../../../`.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
