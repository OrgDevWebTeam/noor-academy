import tseslint from "typescript-eslint";
import noPhysicalClasses from "./eslint/no-physical-classes.mjs";

export default tseslint.config(
  { ignores: ["node_modules/**"] },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      eqeqeq: ["error", "always"],
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  {
    // Primitives must work in Arabic (RTL) and English (LTR) without changes.
    files: ["src/**/*.tsx"],
    plugins: { noor: { rules: { "no-physical-classes": noPhysicalClasses } } },
    rules: { "noor/no-physical-classes": "error" },
  },
);
