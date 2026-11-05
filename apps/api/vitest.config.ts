import { configDefaults, defineConfig } from "vitest/config";

// Unit tests only. Integration tests (*.int.test.ts) need MongoDB and run via test:integration.
export default defineConfig({
  test: { exclude: [...configDefaults.exclude, "**/*.int.test.ts"] },
});
