import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["packages/*/src/**/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.ts"],
      exclude: ["**/__tests__/**", "**/index.ts"],
    },
  },
  resolve: {
    alias: {
      "@ccfm/shared": resolve(__dirname, "packages/shared/src"),
    },
  },
});
