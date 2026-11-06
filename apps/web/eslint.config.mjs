import { baseConfig } from "@noor/ui/eslint/base-config";
import { defineConfig, globalIgnores } from "eslint/config";
import react from "eslint-plugin-react";

const noCrossLayerImports = (message) => [
  "error",
  { patterns: [{ group: ["@/features/**", "@/pages/**"], message }] },
];

export default defineConfig([
  globalIgnores(["dist/**"]),
  baseConfig(import.meta.dirname),
  {
    // All UI text comes from the dictionaries (VAL-009).
    files: ["src/**/*.tsx"],
    plugins: { react },
    settings: { react: { version: "detect" } },
    rules: {
      "react/jsx-no-literals": ["error", { noStrings: true, ignoreProps: true }],
    },
  },
  {
    // Development-only pages use sample text directly. Production builds do not contain them.
    files: ["src/pages/dev/**"],
    rules: { "react/jsx-no-literals": "off" },
  },
  {
    files: ["src/features/**"],
    rules: {
      "no-restricted-imports": noCrossLayerImports(
        "A feature must not import another feature or a page. Compose them in a page.",
      ),
    },
  },
  {
    files: ["src/components/**", "src/lib/**", "src/i18n/**"],
    rules: {
      "no-restricted-imports": noCrossLayerImports(
        "Shared code must not depend on features or pages.",
      ),
    },
  },
]);
