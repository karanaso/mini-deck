import * as Y from "yjs";
import { eq } from "drizzle-orm";

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
import { createDeckBodySchema } from "@/server/access-validation";
import { getDeckSessionSecret } from "@/server/auth";
import { generateUniqueJoinCode } from "@/server/join-code";
import { generateDeckPins, hashPin } from "@/server/pins";
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

  let payload: unknown = {};
  const rawBody = await request.text();
  if (rawBody.trim()) {
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return apiError(400, "invalid_request", "Expected a JSON request body");
    }
  }
  const parsed = createDeckBodySchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(
      400,
      "invalid_request",
      "Expected an access mode of protected or open",
    );
  }
  const { accessMode } = parsed.data;

  const deckId = createDeckId();
  const editToken = await generateEditToken();
  const viewToken = await deriveViewToken(editToken, deckId);
  const pins = accessMode === "protected" ? generateDeckPins() : null;
  const [editTokenHash, viewTokenHash, editPinHash, viewPinHash] =
    await Promise.all([
      hashToken(editToken),
      hashToken(viewToken),
      pins ? hashPin(pins.editPin) : Promise.resolve(null),
      pins ? hashPin(pins.viewPin) : Promise.resolve(null),
    ]);

  const document = createInitialDeckDoc();
  const state = Y.encodeStateAsUpdate(document);
  const title = getDeckTitle(document);
  document.destroy();

  const { db } = getDatabase();

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
    const rows = await db
      .select({ id: decks.id })
      .from(decks)
      .where(eq(decks.joinCode, code))
      .limit(1);
    return rows.length === 0;
  });

  const now = new Date();
  try {
    await db.transaction(async (tx) => {
      await tx.insert(decks).values({
        id: deckId,
        title,
        editTokenHash,
        viewTokenHash,
        joinCode,
        editPinHash,
        viewPinHash,
        pinVersion: accessMode === "protected" ? 1 : 0,
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

  return jsonResponse(
    {
      deckId,
      editToken,
      title,
      accessMode,
      joinCode,
      editPin: pins?.editPin ?? null,
      viewPin: pins?.viewPin ?? null,
    },
    { status: 201 },
  );
}
