import { defineConfig } from "@playwright/test";

const baseURL =
  process.env.CONTAINER_BASE_URL ??
  process.env.PLAYWRIGHT_BASE_URL ??
  "http://localhost:8080";

process.env.PLAYWRIGHT_BASE_URL = baseURL;

const channel =
  process.env.PLAYWRIGHT_CHANNEL === "none"
    ? undefined
    : (process.env.PLAYWRIGHT_CHANNEL ?? "chrome");

export default defineConfig({
  testDir: "./e2e",
  testMatch: "container.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  globalTimeout: 10 * 60_000,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report/container", open: "never" }],
  ],
  use: {
    baseURL,
    viewport: { width: 1440, height: 900 },
    channel,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    permissions: ["clipboard-read", "clipboard-write"],
    ignoreHTTPSErrors: true,
  },
});
