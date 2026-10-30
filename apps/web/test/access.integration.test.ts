import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import * as Y from "yjs";

import { deckDocuments, decks, getDatabase } from "@mini-deck/db";
import {
  createDeckId,
  createInitialDeckDoc,
  deriveViewToken,
  generateEditToken,
  hashToken,
} from "@mini-deck/deck";

import { POST as createDeckRoute } from "@/app/api/decks/route";
import { POST as sessionRoute } from "@/app/api/decks/[deckId]/session/route";
import { POST as uploadAsset } from "@/app/api/decks/[deckId]/assets/route";
import { POST as resetAccess } from "@/app/api/decks/[deckId]/access/reset/route";
import { POST as lookupJoin } from "@/app/api/join/lookup/route";
import { POST as unlockJoin } from "@/app/api/join/unlock/route";
import { resetServerEnvForTests } from "@/server/env";
import { resetRateLimitersForTests } from "@/server/rate-limit";
import { resetAssetStorageForTests } from "@/server/storage";
import { resetIntegrationState } from "../../../test/integration-helpers";
import {
  createProtectedDeck,
  params,
  unlockDeck,
  unlockDeckRaw,
} from "./access-helpers";

const originalEnv = { ...process.env };

function request(
  url: string,
  options: {
    token?: string;
    body?: unknown;
    method?: string;
    ip?: string;
  } = {},
): Request {
  return new Request(url, {
    method: options.method ?? "POST",
    headers: {
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      "content-type": "application/json",
      "x-forwarded-for": options.ip ?? "127.0.0.1",
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
}

function sessionRequest(deckId: string, token: string, ip = "127.0.0.1"): Request {
  return new Request(`http://localhost/api/decks/${deckId}/session`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "x-forwarded-for": ip },
  });
}

beforeEach(async () => {
  await resetIntegrationState();
  resetRateLimitersForTests();
  resetAssetStorageForTests();
  process.env.PIN_ATTEMPT_RATE_LIMIT = "100";
  process.env.PIN_DECK_ATTEMPT_RATE_LIMIT = "100";
  process.env.JOIN_LOOKUP_RATE_LIMIT = "100";
  process.env.JOIN_CODE_ATTEMPT_RATE_LIMIT = "100";
  resetServerEnvForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...originalEnv };
  resetServerEnvForTests();
  resetRateLimitersForTests();
});

async function createLegacyDeck(): Promise<{
  deckId: string;
  editToken: string;
  viewToken: string;
}> {
  const deckId = createDeckId();
  const editToken = await generateEditToken();
  const viewToken = await deriveViewToken(editToken, deckId);
  const document = createInitialDeckDoc();
  const { db } = getDatabase();
  const now = new Date();
  await db.insert(decks).values({
    id: deckId,
    title: "Legacy deck",
    editTokenHash: await hashToken(editToken),
    viewTokenHash: await hashToken(viewToken),
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(deckDocuments).values({
    deckId,
    state: Y.encodeStateAsUpdate(document),
    updatedAt: now,
  });
  document.destroy();
  return { deckId, editToken, viewToken };
}

describe("deck creation access values", () => {
  it("returns a join code and two PINs once and stores only hashes", async () => {
    const deck = await createProtectedDeck();

    expect(deck.joinCode).toMatch(/^\d{7}$/u);
    expect(deck.editPin).toMatch(/^\d{6}$/u);
    expect(deck.viewPin).toMatch(/^\d{6}$/u);
    expect(deck.editPin).not.toBe(deck.viewPin);

    const { db } = getDatabase();
    const rows = await db.select().from(decks).where(eq(decks.id, deck.deckId));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      joinCode: deck.joinCode,
      pinVersion: 1,
    });
    expect(rows[0].editPinHash).toBeTruthy();
    expect(rows[0].viewPinHash).toBeTruthy();
    expect(rows[0].editPinHash).not.toBe(deck.editPin);
    expect(rows[0].viewPinHash).not.toBe(deck.viewPin);
  });

  it("rejects creation when production has no session secret", async () => {
    process.env.NODE_ENV = "production";
    process.env.DECK_SESSION_SECRET = "";
    resetServerEnvForTests();

    const response = await createDeckRoute(
      new Request("http://localhost/api/decks", {
        method: "POST",
        headers: { "x-forwarded-for": "127.0.0.1" },
      }),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: "access_not_configured" },
    });
  });
});

describe("session and unlock", () => {
  it("reports the required role before a PIN is accepted", async () => {
    const deck = await createProtectedDeck();

    const editor = await sessionRoute(
      sessionRequest(deck.deckId, deck.editToken, "10.0.0.1"),
      params({ deckId: deck.deckId }),
    );
    expect(editor.status).toBe(200);
    expect(await editor.json()).toEqual({ requiresPin: true, role: "editor" });

    const viewer = await sessionRoute(
      sessionRequest(deck.deckId, deck.viewToken, "10.0.0.2"),
      params({ deckId: deck.deckId }),
    );
    expect(await viewer.json()).toEqual({ requiresPin: true, role: "viewer" });
  });

  it("rejects a raw edit token on a protected resource", async () => {
    const deck = await createProtectedDeck();
    const response = await uploadAsset(
      new Request(`http://localhost/api/decks/${deck.deckId}/assets`, {
        method: "POST",
        headers: { authorization: `Bearer ${deck.editToken}` },
      }),
      params({ deckId: deck.deckId }),
    );
    expect(response.status).toBe(404);
  });

  it("accepts the correct role PIN and rejects the other role PIN", async () => {
    const deck = await createProtectedDeck();

    const wrongRole = await unlockDeckRaw(
      deck.deckId,
      deck.viewToken,
      deck.editPin,
      "10.0.0.3",
    );
    expect(wrongRole.status).toBe(401);

    const editor = await unlockDeck(deck.deckId, deck.editToken, deck.editPin, "10.0.0.4");
    expect(editor.role).toBe("editor");
    expect(editor.expiresAt).toBeGreaterThan(Date.now());

    const session = await sessionRoute(
      sessionRequest(deck.deckId, editor.unlockToken, "10.0.0.4"),
      params({ deckId: deck.deckId }),
    );
    expect(session.status).toBe(200);
    expect(await session.json()).toEqual({
      role: "editor",
      title: deck.title,
      protected: true,
    });
  });

  it("rate limits repeated wrong PINs", async () => {
    const deck = await createProtectedDeck();
    process.env.PIN_ATTEMPT_RATE_LIMIT = "1";
    process.env.PIN_DECK_ATTEMPT_RATE_LIMIT = "100";
    resetServerEnvForTests();
    resetRateLimitersForTests();

    const first = await unlockDeckRaw(
      deck.deckId,
      deck.editToken,
      "000000",
      "10.0.0.5",
    );
    expect(first.status).toBe(401);

    const second = await unlockDeckRaw(
      deck.deckId,
      deck.editToken,
      "000000",
      "10.0.0.5",
    );
    expect(second.status).toBe(429);
  });
});

describe("join code flow", () => {
  it("looks up a deck and unlocks either role", async () => {
    const deck = await createProtectedDeck();

    const lookup = await lookupJoin(
      request("http://localhost/api/join/lookup", {
        body: { code: deck.joinCode },
      }),
    );
    expect(lookup.status).toBe(200);
    expect(await lookup.json()).toEqual({
      deckId: deck.deckId,
      title: deck.title,
    });

    const editor = await unlockJoin(
      request("http://localhost/api/join/unlock", {
        body: { code: deck.joinCode, role: "editor", pin: deck.editPin },
      }),
    );
    expect(editor.status).toBe(200);
    expect(await editor.json()).toMatchObject({
      deckId: deck.deckId,
      role: "editor",
      title: deck.title,
      unlockToken: expect.any(String),
    });

    const viewer = await unlockJoin(
      request("http://localhost/api/join/unlock", {
        body: { code: deck.joinCode, role: "viewer", pin: deck.viewPin },
      }),
    );
    expect(await viewer.json()).toMatchObject({ role: "viewer" });
  });

  it("accepts leading-zero codes and rejects unknown codes", async () => {
    const deck = await createProtectedDeck();
    const { db } = getDatabase();
    await db
      .update(decks)
      .set({ joinCode: "0001234" })
      .where(eq(decks.id, deck.deckId));

    const found = await lookupJoin(
      request("http://localhost/api/join/lookup", {
        body: { code: "0001234" },
      }),
    );
    expect(found.status).toBe(200);

    const missing = await lookupJoin(
      request("http://localhost/api/join/lookup", {
        body: { code: "9999999" },
      }),
    );
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({
      error: { code: "not_found" },
    });
  });

  it("does not reveal content before the role PIN", async () => {
    const deck = await createProtectedDeck();
    const lookup = await lookupJoin(
      request("http://localhost/api/join/lookup", {
        body: { code: deck.joinCode },
      }),
    );
    const body = await lookup.json();
    expect(body).not.toHaveProperty("slides");
    expect(body).not.toHaveProperty("editPin");
    expect(body).not.toHaveProperty("unlockToken");
  });
});

describe("access reset", () => {
  it("rotates the join code and both PINs and invalidates sessions", async () => {
    const deck = await createProtectedDeck();
    const session = await unlockDeck(deck.deckId, deck.editToken, deck.editPin);

    const response = await resetAccess(
      request(`http://localhost/api/decks/${deck.deckId}/access/reset`, {
        token: session.unlockToken,
      }),
      params({ deckId: deck.deckId }),
    );
    expect(response.status).toBe(200);
    const reset = (await response.json()) as {
      joinCode: string;
      editPin: string;
      viewPin: string;
      unlockToken: string;
    };
    expect(reset.joinCode).not.toBe(deck.joinCode);
    expect(reset.editPin).not.toBe(deck.editPin);
    expect(reset.viewPin).not.toBe(deck.viewPin);

    const oldCode = await lookupJoin(
      request("http://localhost/api/join/lookup", {
        body: { code: deck.joinCode },
      }),
    );
    expect(oldCode.status).toBe(404);

    const oldPin = await unlockDeckRaw(
      deck.deckId,
      deck.editToken,
      deck.editPin,
      "10.0.1.1",
    );
    expect(oldPin.status).toBe(401);

    const oldSession = await sessionRoute(
      sessionRequest(deck.deckId, session.unlockToken, "10.0.1.1"),
      params({ deckId: deck.deckId }),
    );
    expect(oldSession.status).toBe(404);

    const newSession = await unlockDeck(
      deck.deckId,
      deck.editToken,
      reset.editPin,
      "10.0.1.2",
    );
    expect(newSession.role).toBe("editor");
  });

  it("does not let viewers reset access", async () => {
    const deck = await createProtectedDeck();
    const viewer = await unlockDeck(deck.deckId, deck.viewToken, deck.viewPin);
    const response = await resetAccess(
      request(`http://localhost/api/decks/${deck.deckId}/access/reset`, {
        token: viewer.unlockToken,
      }),
      params({ deckId: deck.deckId }),
    );
    expect(response.status).toBe(403);
  });
});

describe("legacy decks", () => {
  it("keeps link-only access without a PIN prompt", async () => {
    const deck = await createLegacyDeck();
    const session = await sessionRoute(
      sessionRequest(deck.deckId, deck.editToken, "10.0.2.1"),
      params({ deckId: deck.deckId }),
    );
    expect(session.status).toBe(200);
    expect(await session.json()).toEqual({
      role: "editor",
      title: "Legacy deck",
      protected: false,
    });

    const upload = await uploadAsset(
      new Request(`http://localhost/api/decks/${deck.deckId}/assets`, {
        method: "POST",
        headers: { authorization: `Bearer ${deck.editToken}` },
      }),
      params({ deckId: deck.deckId }),
    );
    expect(upload.status).toBe(400);
  });
});
