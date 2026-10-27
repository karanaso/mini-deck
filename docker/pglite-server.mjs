import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const port = Number(process.env.PGLITE_PORT ?? 5433);
const dataDir = resolve(process.env.PGLITE_DATA_DIR ?? ".data/pglite");
const maxConnections = 50;

mkdirSync(dataDir, { recursive: true });

const db = await PGlite.create({ dataDir });
const server = new PGLiteSocketServer({
  db,
  port,
  host: "127.0.0.1",
  maxConnections,
});

server.addEventListener("listening", () => {
  console.log(`[pglite] listening on 127.0.0.1:${port} (${dataDir})`);
});

server.addEventListener("error", (event) => {
  console.error("[pglite] socket error", event);
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[pglite] shutting down (${signal})`);
  try {
    await server.stop();
  } finally {
    await db.close();
    process.exit(0);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

try {
  await server.start();
} catch (error) {
  console.error("[pglite] failed to start", error);
  await db.close().catch(() => {});
  process.exit(1);
}
