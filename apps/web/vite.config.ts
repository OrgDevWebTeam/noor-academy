import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // The browser consumes shared contracts as TypeScript source (no CommonJS build).
      "@noor/contracts": fileURLToPath(
        new URL("../../packages/contracts/src/index.ts", import.meta.url),
      ),
    },
  },
  server: {
    port: 3000,
    // Same-origin API calls in development, so no CORS setup is needed locally.
    proxy: { "/v1": "http://127.0.0.1:4000" },
  },
});
