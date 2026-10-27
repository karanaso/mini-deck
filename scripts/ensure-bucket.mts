import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env");
} catch {
  // Environment variables can also be supplied by the shell.
}

const { getAssetStorage } = await import("../apps/web/src/server/storage.ts");
const { getServerEnv } = await import("../apps/web/src/server/env.ts");

const env = getServerEnv();
await getAssetStorage().ensureReady();
console.log(
  env.STORAGE_DRIVER === "s3"
    ? `S3 bucket ready: ${env.S3_BUCKET}`
    : `Local asset directory ready: ${env.STORAGE_DIR}`,
);
