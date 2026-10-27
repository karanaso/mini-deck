import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  oxc: {
    jsx: { runtime: "automatic" },
  },
  resolve: {
    alias: {
      "@mini-deck/deck": `${root}packages/deck/src/index.ts`,
      "@mini-deck/db": `${root}packages/db/src/index.ts`,
      "@": `${root}apps/web/src`,
    },
  },
  test: {
    environment: "node",
    include: [
      "packages/**/test/**/*.test.{ts,tsx}",
      "packages/**/src/**/*.test.{ts,tsx}",
      "apps/**/test/**/*.test.{ts,tsx}",
      "apps/**/src/**/*.test.{ts,tsx}",
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/*.integration.test.ts",
      "e2e/**",
    ],
    setupFiles: [`${root}test/setup.ts`],
    passWithNoTests: true,
  },
});
