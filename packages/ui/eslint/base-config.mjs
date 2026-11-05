import js from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import noPhysicalClasses from "./no-physical-classes.mjs";

/**
 * ESLint rules shared by the React packages (apps/web, packages/ui).
 *
 * ESLint applies the config closest to each file, so the root `pnpm lint` uses these rules too.
 * The presets under `tseslint.configs` register the calling folder as a TypeScript root, and more
 * than one registered root makes the parser fail across the whole repo. So this config takes the
 * parser and the rules directly, and each package passes its own folder as `tsconfigRootDir`.
 */
export function baseConfig(tsconfigRootDir) {
  const { parser, plugin } = tseslint;

  return [
    js.configs.recommended,
    {
      rules: {
        eqeqeq: ["error", "always"],
        "no-console": ["error", { allow: ["warn", "error"] }],
      },
    },
    {
      files: ["**/*.{ts,tsx,mts}"],
      languageOptions: { parser, parserOptions: { tsconfigRootDir } },
      plugins: { "@typescript-eslint": plugin },
      rules: {
        ...plugin.configs["eslint-recommended"].overrides[0].rules,
        ...plugin.configs.recommended.rules,
        "@typescript-eslint/consistent-type-imports": [
          "error",
          { fixStyle: "inline-type-imports" },
        ],
      },
    },
    {
      // Components must work in Arabic (RTL) and English (LTR), and for assistive technology.
      files: ["src/**/*.tsx"],
      plugins: {
        noor: { rules: { "no-physical-classes": noPhysicalClasses } },
        "jsx-a11y": jsxA11y,
        "react-hooks": reactHooks,
      },
      rules: {
        ...jsxA11y.flatConfigs.recommended.rules,
        "noor/no-physical-classes": "error",
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "error",
      },
    },
  ];
}
