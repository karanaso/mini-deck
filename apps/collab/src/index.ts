import "dotenv/config";

import { closeDatabase } from "@mini-deck/db";
import { startCollabServer } from "./server.js";

const server = await startCollabServer();

async function shutdown(signal: string) {
  console.info(JSON.stringify({ event: "collab.shutdown", signal }));
  try {
    await server.destroy();
  } finally {
    await closeDatabase();
    process.exit(0);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
