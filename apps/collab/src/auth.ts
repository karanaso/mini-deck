import { eq } from "drizzle-orm";

import { decks, getDatabase } from "@mini-deck/db";
import { hashToken, resolveRole, type Role } from "@mini-deck/deck";

export interface DeckAccess {
  deckId: string;
  title: string;
  role: Role;
}

export async function resolveDeckAccess(
  deckId: string,
  token: string,
): Promise<DeckAccess | null> {
  if (!deckId || !token) return null;
  const { db } = getDatabase();
  const rows = await db.select().from(decks).where(eq(decks.id, deckId)).limit(1);
  const deck = rows[0];
  if (!deck) return null;

  const tokenHash = await hashToken(token);
  const role = resolveRole(tokenHash, deck.editTokenHash, deck.viewTokenHash);
  if (!role) return null;

  return { deckId, title: deck.title, role };
}

export function redactToken(token: string): string {
  if (!token) return "";
  if (token.length <= 8) return "***";
  return `${token.slice(0, 3)}…${token.slice(-2)}`;
}
