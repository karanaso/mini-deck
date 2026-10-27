import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { closeDatabase, decks, getDatabase } from "../src/index.js";
import { resetDatabase, resetIntegrationState } from "../../../test/integration-helpers.js";

describe("database client and integration harness", () => {
  beforeEach(async () => {
    await resetIntegrationState();
  });

  afterAll(async () => {
    await resetDatabase();
    await closeDatabase();
  });

  it("connects, writes, reads, and cleans up a deck row", async () => {
    const { db } = getDatabase();
    const now = new Date();
    await db.insert(decks).values({
      id: "deck-test-1",
      title: "Test deck",
      editTokenHash: "edit-hash",
      viewTokenHash: "view-hash",
      createdAt: now,
      updatedAt: now,
    });

    const rows = await db.select().from(decks);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("Test deck");

    await resetDatabase();
    expect(await db.select().from(decks)).toHaveLength(0);
  });
});
