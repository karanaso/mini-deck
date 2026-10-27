import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@mini-deck/deck": `${root}packages/deck/src/index.ts`,
      "@mini-deck/db": `${root}packages/db/src/index.ts`,
      "@": `${root}apps/web/src`,
    },
  },
  test: {
    environment: "node",
    include: ["packages/**/test/**/*.integration.test.ts", "apps/**/test/**/*.integration.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
    setupFiles: [`${root}test/integration-setup.ts`],
    sequence: { concurrent: false },
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 20_000,
    passWithNoTests: true,
  },
});
