import { describe, expect, it } from "vitest";

import { checkDatabaseHealth } from "@/server/health";

describe("database health check", () => {
  it("returns true when the query succeeds", async () => {
    const database = { execute: async () => undefined } as never;
    await expect(checkDatabaseHealth(database)).resolves.toBe(true);
  });

  it("returns false when the database is unavailable", async () => {
    const database = {
      execute: async () => {
        throw new Error("connection refused");
      },
    } as never;
    await expect(checkDatabaseHealth(database)).resolves.toBe(false);
  });
});
