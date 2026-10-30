import { eq } from "drizzle-orm";

import { decks, getDatabase } from "@mini-deck/db";
import {
  hashToken,
  resolveRole,
  resolveUnlockSessionSecret,
  verifyUnlockSessionToken,
  type Role,
} from "@mini-deck/deck";

import { getCollabEnv } from "./env.js";

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

  if (token.startsWith("v1.")) {
    const env = getCollabEnv();
    let secret: string;
    try {
      secret = resolveUnlockSessionSecret(env.DECK_SESSION_SECRET, env.NODE_ENV);
    } catch {
      return null;
    }
    const payload = await verifyUnlockSessionToken(token, secret);
    if (
      !payload ||
      payload.deckId !== deckId ||
      payload.pinVersion !== deck.pinVersion
    ) {
      return null;
    }
    return { deckId, title: deck.title, role: payload.role };
  }

  const tokenHash = await hashToken(token);
  const role = resolveRole(tokenHash, deck.editTokenHash, deck.viewTokenHash);
  if (!role) return null;

  // A raw link token must never bypass PIN protection.
  if (deck.editPinHash && deck.viewPinHash) return null;

  return { deckId, title: deck.title, role };
}

export function redactToken(token: string): string {
  if (!token) return "";
  if (token.length <= 8) return "***";
  return `${token.slice(0, 3)}…${token.slice(-2)}`;
}
