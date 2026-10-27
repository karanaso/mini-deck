import { eq } from "drizzle-orm";

import { decks, getDatabase } from "@mini-deck/db";
import {
  hashToken,
  resolveRole,
  type Role,
} from "@mini-deck/deck";

export interface AuthorizedDeck {
  deckId: string;
  title: string;
  role: Role;
}

export async function authorizeDeck(
  deckId: string,
  token: string | null,
): Promise<AuthorizedDeck | null> {
  if (!token) return null;
  const { db } = getDatabase();
  const rows = await db.select().from(decks).where(eq(decks.id, deckId)).limit(1);
  const deck = rows[0];
  if (!deck) return null;

  const tokenHash = await hashToken(token);
  const role = resolveRole(tokenHash, deck.editTokenHash, deck.viewTokenHash);
  if (!role) return null;

  return { deckId, title: deck.title, role };
}
