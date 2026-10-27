import { eq } from "drizzle-orm";
import * as Y from "yjs";

import { deckDocuments, decks, getDatabase } from "@mini-deck/db";
import { createInitialDeckDoc, getDeckTitle } from "@mini-deck/deck";

export async function loadDocumentState(deckId: string): Promise<Uint8Array> {
  const { db } = getDatabase();
  const rows = await db
    .select({ state: deckDocuments.state })
    .from(deckDocuments)
    .where(eq(deckDocuments.deckId, deckId))
    .limit(1);

  if (rows[0]?.state) {
    return new Uint8Array(rows[0].state);
  }

  const doc = createInitialDeckDoc();
  const state = Y.encodeStateAsUpdate(doc);
  doc.destroy();
  return state;
}

export async function storeDocumentState(deckId: string, document: Y.Doc): Promise<void> {
  const state = Y.encodeStateAsUpdate(document);
  const title = getDeckTitle(document).slice(0, 120);
  const { db } = getDatabase();

  await db.transaction(async (tx) => {
    await tx
      .insert(deckDocuments)
      .values({ deckId, state, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: deckDocuments.deckId,
        set: { state, updatedAt: new Date() },
      });

    await tx
      .update(decks)
      .set({ title, updatedAt: new Date() })
      .where(eq(decks.id, deckId));
  });
}
