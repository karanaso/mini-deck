import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

import { getDatabase } from "@mini-deck/db";

export async function resetDatabase(): Promise<void> {
  const { client } = getDatabase();
  await client.unsafe(
    "TRUNCATE TABLE deck_assets, deck_documents, decks RESTART IDENTITY CASCADE",
  );
}

export async function resetStorage(): Promise<void> {
  const storageDir = resolve(
    process.env.STORAGE_DIR ?? resolve(process.cwd(), ".data/test-assets"),
  );
  await rm(storageDir, { recursive: true, force: true });
  await mkdir(storageDir, { recursive: true });
}

export async function resetIntegrationState(): Promise<void> {
  await resetDatabase();
  await resetStorage();
}
