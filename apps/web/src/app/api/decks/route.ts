import * as Y from "yjs";

import { deckDocuments, decks, getDatabase } from "@mini-deck/db";
import {
  createDeckId,
  createInitialDeckDoc,
  deriveViewToken,
  generateEditToken,
  getDeckTitle,
  hashToken,
} from "@mini-deck/deck";

import { apiError, getClientIp, jsonResponse } from "@/server/api";
import { getDeckCreateLimiter } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const ip = getClientIp(request);
  const limit = getDeckCreateLimiter().take(ip);
  if (!limit.allowed) {
    return apiError(429, "rate_limited", "Too many decks created. Try again shortly.", {
      headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) },
    });
  }

  const deckId = createDeckId();
  const editToken = await generateEditToken();
  const viewToken = await deriveViewToken(editToken, deckId);
  const [editTokenHash, viewTokenHash] = await Promise.all([
    hashToken(editToken),
    hashToken(viewToken),
  ]);

  const document = createInitialDeckDoc();
  const state = Y.encodeStateAsUpdate(document);
  const title = getDeckTitle(document);
  document.destroy();

  const { db } = getDatabase();
  const now = new Date();
  try {
    await db.transaction(async (tx) => {
      await tx.insert(decks).values({
        id: deckId,
        title,
        editTokenHash,
        viewTokenHash,
        createdAt: now,
        updatedAt: now,
      });
      await tx.insert(deckDocuments).values({
        deckId,
        state,
        updatedAt: now,
      });
    });
  } catch (error) {
    console.error(
      "Failed to create deck:",
      error instanceof Error ? error.message : "unknown database error",
    );
    return apiError(
      503,
      "database_unavailable",
      "The database is unavailable. Run `pnpm dev` (or `pnpm db:migrate`) and try again.",
    );
  }

  return jsonResponse({ deckId, editToken, title }, { status: 201 });
}
