import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const fromRoot = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      {
        find: /^@noor\/contracts\/(.*)$/,
        replacement:
          fileURLToPath(new URL("../../packages/contracts/src/", import.meta.url)) + "$1",
      },
      {
        find: /^@noor\/contracts$/,
        replacement: fileURLToPath(
          new URL("../../packages/contracts/src/index.ts", import.meta.url),
        ),
      },
      // "@/i18n/config" -> apps/web/src/i18n/config
      { find: /^@\/(.*)$/, replacement: fromRoot("./src/") + "$1" },

      // @noor/ui straight from source (same pattern you use for contracts)
      {
        find: /^@noor\/ui\/(.*)$/,
        replacement: fromRoot("../../packages/ui/src/") + "$1",
      },
      {
        find: /^@noor\/ui$/,
        replacement: fromRoot("../../packages/ui/src/index.ts"),
      },

      {
        find: /^@noor\/contracts\/(.*)$/,
        replacement: fromRoot("../../packages/contracts/src/") + "$1",
      },
      {
        find: /^@noor\/contracts$/,
        replacement: fromRoot("../../packages/contracts/src/index.ts"),
      },
    ],
  },
  server: {
    port: 3000,
    proxy: { "/v1": "http://127.0.0.1:4000" },
  },
});
