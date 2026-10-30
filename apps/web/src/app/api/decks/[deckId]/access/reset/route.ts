import { eq } from "drizzle-orm";

import { decks, getDatabase } from "@mini-deck/db";

import {
  apiError,
  getBearerToken,
  getClientIp,
  jsonResponse,
} from "@/server/api";
import {
  authorizeDeck,
  getDeckSessionSecret,
  issueDeckSession,
} from "@/server/auth";
import { generateUniqueJoinCode } from "@/server/join-code";
import { generateDeckPins, hashPin } from "@/server/pins";
import { getAuthFailureLimiter } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ deckId: string }> },
): Promise<Response> {
  const { deckId } = await context.params;
  const token = getBearerToken(request);
  const access = await authorizeDeck(deckId, token);

  if (!access) {
    const limit = getAuthFailureLimiter().take(getClientIp(request));
    if (!limit.allowed) {
      return apiError(429, "rate_limited", "Too many attempts. Try again shortly.", {
        headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) },
      });
    }
    return apiError(404, "not_found", "Deck not found");
  }
  if (access.role !== "editor") {
    return apiError(403, "read_only", "This deck is read-only");
  }

  const { db } = getDatabase();
  const rows = await db.select().from(decks).where(eq(decks.id, deckId)).limit(1);
  const deck = rows[0];
  if (!deck || !deck.editPinHash || !deck.viewPinHash) {
    return apiError(400, "pins_not_configured", "This deck does not use PIN access");
  }

  try {
    getDeckSessionSecret();
  } catch {
    return apiError(
      503,
      "access_not_configured",
      "Deck access is not configured. Set DECK_SESSION_SECRET on the server.",
    );
  }

  const joinCode = await generateUniqueJoinCode(async (code) => {
    const matches = await db
      .select({ id: decks.id })
      .from(decks)
      .where(eq(decks.joinCode, code))
      .limit(1);
    return matches.length === 0;
  });
  const { editPin, viewPin } = generateDeckPins();
  const [editPinHash, viewPinHash] = await Promise.all([
    hashPin(editPin),
    hashPin(viewPin),
  ]);
  const nextVersion = deck.pinVersion + 1;

  await db
    .update(decks)
    .set({
      joinCode,
      editPinHash,
      viewPinHash,
      pinVersion: nextVersion,
      updatedAt: new Date(),
    })
    .where(eq(decks.id, deckId));

  const session = await issueDeckSession(deckId, "editor");
  return jsonResponse({
    deckId,
    title: access.title,
    role: "editor",
    protected: true,
    joinCode,
    editPin,
    viewPin,
    ...session,
  });
}
