// Same options as the repo's root .prettierrc, plus Tailwind class sorting for this app.
// The plugin is imported (not named) so it resolves from apps/web, whichever folder Prettier runs in.
import * as tailwind from "prettier-plugin-tailwindcss";

/** @type {import("prettier").Config} */
const config = {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 100,
  plugins: [tailwind],
  tailwindStylesheet: "./src/styles.css",
};

export default config;
