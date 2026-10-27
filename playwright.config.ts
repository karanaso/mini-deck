import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

const channel =
  process.env.PLAYWRIGHT_CHANNEL === "none"
    ? undefined
    : process.env.PLAYWRIGHT_CHANNEL ?? "chrome";

const root = process.cwd();

const sharedEnv = {
  ...process.env,
  DATABASE_URL:
    process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5433/minideck",
  STORAGE_DRIVER: "local",
  STORAGE_DIR: resolve(root, ".data/e2e-assets"),
  COLLAB_PORT: "1234",
  COLLAB_DEBOUNCE_MS: "100",
  COLLAB_MAX_DEBOUNCE_MS: "1000",
  PUBLIC_APP_URL: "http://localhost:3100",
  NEXT_PUBLIC_COLLAB_WS_URL: "ws://localhost:1234",
  DECK_CREATE_RATE_LIMIT: "10000",
  AUTH_FAILURE_RATE_LIMIT: "10000",
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  globalTimeout: 15 * 60_000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3100",
    locale: "en-US",
    viewport: { width: 1440, height: 900 },
    channel,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    permissions: ["clipboard-read", "clipboard-write"],
  },
  webServer: [
    {
      command: "node apps/collab/dist/index.js",
      url: "http://127.0.0.1:1234/health",
      timeout: 120_000,
      reuseExistingServer: false,
      env: sharedEnv,
    },
    {
      command: "pnpm --filter @mini-deck/web exec next start --port 3100",
      url: "http://127.0.0.1:3100/api/health",
      timeout: 120_000,
      reuseExistingServer: false,
      env: sharedEnv,
    },
  ],
});
