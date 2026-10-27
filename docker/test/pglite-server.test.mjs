import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { createConnection } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";

import { createDatabase } from "../../packages/db/dist/index.js";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPort(port, child, getStderr) {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`PGlite process exited early: ${getStderr()}`);
    }
    const connected = await new Promise((resolve) => {
      const socket = createConnection({ host: "127.0.0.1", port });
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", () => {
        socket.destroy();
        resolve(false);
      });
    });
    if (connected) return;
    await wait(100);
  }
  throw new Error(`PGlite did not listen on 127.0.0.1:${port}: ${getStderr()}`);
}

test("PGlite socket server accepts a PostgreSQL client", { timeout: 30_000 }, async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "mini-deck-pglite-"));
  const port = 55_000 + Math.floor(Math.random() * 5_000);
  const child = spawn(process.execPath, ["docker/pglite-server.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PGLITE_PORT: String(port),
      PGLITE_DATA_DIR: dataDir,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  try {
    await waitForPort(port, child, () => `${stdout}\n${stderr}`);

    const { client } = createDatabase(
      `postgres://postgres:postgres@127.0.0.1:${port}/minideck`,
    );
    try {
      const rows = await client`select 1 as value`;
      assert.equal(rows[0]?.value, 1);
    } finally {
      await client.end({ timeout: 5 });
    }
  } finally {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await Promise.race([once(child, "exit"), wait(5_000)]);
      if (child.exitCode === null) child.kill("SIGKILL");
    }
    rmSync(dataDir, { recursive: true, force: true });
  }
});
