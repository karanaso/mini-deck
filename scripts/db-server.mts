import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dataDir = resolve(root, ".data/pglite");
const port = Number(process.env.PGLITE_PORT ?? 5433);

mkdirSync(dataDir, { recursive: true });

const db = await PGlite.create({ dataDir });
const server = new PGLiteSocketServer({
  db,
  port,
  host: "127.0.0.1",
  maxConnections: 20,
});

server.addEventListener("listening", () => {
  console.log(`PGlite listening on 127.0.0.1:${port} (${dataDir})`);
});

server.addEventListener("error", (event) => {
  console.error("PGlite socket error", event);
});

await server.start();

async function shutdown() {
  await server.stop();
  await db.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
