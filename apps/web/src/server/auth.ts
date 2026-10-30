import { eq } from "drizzle-orm";

import { decks, getDatabase } from "@mini-deck/db";
import {
  UNLOCK_SESSION_DURATION_MS,
  createUnlockSessionToken,
  hashToken,
  resolveRole,
  resolveUnlockSessionSecret,
  verifyUnlockSessionToken,
  type Role,
} from "@mini-deck/deck";

import { getServerEnv } from "./env";
import { verifyPin } from "./pins";

export interface AuthorizedDeck {
  deckId: string;
  title: string;
  role: Role;
  protected: boolean;
}

export interface DeckLinkAccess extends AuthorizedDeck {
  requiresPin: boolean;
}

interface DeckRow {
  id: string;
  title: string;
  editTokenHash: string;
  viewTokenHash: string;
  joinCode: string | null;
  editPinHash: string | null;
  viewPinHash: string | null;
  pinVersion: number;
}

async function loadDeck(deckId: string): Promise<DeckRow | null> {
  const { db } = getDatabase();
  const rows = await db.select().from(decks).where(eq(decks.id, deckId)).limit(1);
  return rows[0] ?? null;
}

export function isProtectedDeck(deck: Pick<DeckRow, "editPinHash" | "viewPinHash">): boolean {
  return Boolean(deck.editPinHash && deck.viewPinHash);
}

export function getDeckSessionSecret(): string {
  const env = getServerEnv();
  return resolveUnlockSessionSecret(env.DECK_SESSION_SECRET, env.NODE_ENV);
}

async function resolveSessionToken(
  deck: DeckRow,
  token: string,
): Promise<Role | null> {
  if (!token.startsWith("v1.")) return null;
  let secret: string;
  try {
    secret = getDeckSessionSecret();
  } catch {
    return null;
  }
  const payload = await verifyUnlockSessionToken(token, secret);
  if (
    !payload ||
    payload.deckId !== deck.id ||
    payload.pinVersion !== deck.pinVersion
  ) {
    return null;
  }
  return payload.role;
}

export async function resolveDeckLink(
  deckId: string,
  token: string | null,
): Promise<DeckLinkAccess | null> {
  if (!token) return null;
  const deck = await loadDeck(deckId);
  if (!deck) return null;

  const sessionRole = await resolveSessionToken(deck, token);
  if (sessionRole) {
    return {
      deckId,
      title: deck.title,
      role: sessionRole,
      protected: isProtectedDeck(deck),
      requiresPin: false,
    };
  }

  const tokenHash = await hashToken(token);
  const role = resolveRole(tokenHash, deck.editTokenHash, deck.viewTokenHash);
  if (!role) return null;
  const protectedDeck = isProtectedDeck(deck);
  return {
    deckId,
    title: deck.title,
    role,
    protected: protectedDeck,
    requiresPin: protectedDeck,
  };
}

export async function authorizeDeck(
  deckId: string,
  token: string | null,
): Promise<AuthorizedDeck | null> {
  const access = await resolveDeckLink(deckId, token);
  if (!access || access.requiresPin) return null;
  return {
    deckId: access.deckId,
    title: access.title,
    role: access.role,
    protected: access.protected,
  };
}

export async function verifyDeckPin(
  deckId: string,
  role: Role,
  pin: string,
): Promise<boolean> {
  const deck = await loadDeck(deckId);
  if (!deck || !isProtectedDeck(deck)) return false;
  return verifyPin(pin, role === "editor" ? deck.editPinHash : deck.viewPinHash);
}

export async function issueDeckSession(
  deckId: string,
  role: Role,
): Promise<{ unlockToken: string; expiresAt: number }> {
  const deck = await loadDeck(deckId);
  if (!deck || !isProtectedDeck(deck)) {
    throw new Error("Deck is not PIN protected");
  }
  const expiresAt = Date.now() + UNLOCK_SESSION_DURATION_MS;
  const unlockToken = await createUnlockSessionToken(
    {
      deckId,
      role,
      pinVersion: deck.pinVersion,
      exp: expiresAt,
    },
    getDeckSessionSecret(),
  );
  return { unlockToken, expiresAt };
}

export async function findDeckByJoinCode(code: string): Promise<DeckRow | null> {
  const { db } = getDatabase();
  const rows = await db
    .select()
    .from(decks)
    .where(eq(decks.joinCode, code))
    .limit(1);
  return rows[0] ?? null;
}
