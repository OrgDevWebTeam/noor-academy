import { defineConfig } from "eslint/config";
import { baseConfig } from "./eslint/base-config.mjs";

export default defineConfig([baseConfig(import.meta.dirname)]);
