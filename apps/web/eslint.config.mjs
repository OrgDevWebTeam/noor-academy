import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import noPhysicalClasses from "@noor/ui/eslint/no-physical-classes";

const noCrossLayerImports = (message) => [
  "error",
  { patterns: [{ group: ["@/features/**", "@/app/**"], message }] },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: { noor: { rules: { "no-physical-classes": noPhysicalClasses } } },
    rules: {
      "noor/no-physical-classes": "error",
      eqeqeq: ["error", "always"],
      "no-console": ["error", { allow: ["warn", "error"] }],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
    },
  },
  {
    // All UI text comes from the dictionaries (VAL-009).
    files: ["src/**/*.tsx"],
    rules: {
      "react/jsx-no-literals": ["error", { noStrings: true, ignoreProps: true }],
    },
  },
  {
    // Developer-only showcase pages (/dev/*, 404 in production) use sample text directly.
    files: ["src/app/**/(dev)/**"],
    rules: { "react/jsx-no-literals": "off" },
  },
  {
    files: ["src/features/**"],
    rules: {
      "no-restricted-imports": noCrossLayerImports(
        "A feature must not import another feature or a route. Compose them in a page.",
      ),
    },
  },
  {
    files: ["src/components/**", "src/lib/**", "src/i18n/**"],
    rules: {
      "no-restricted-imports": noCrossLayerImports(
        "Shared code must not depend on features or routes.",
      ),
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
