import { beforeEach, describe, expect, it } from "vitest";
import * as Y from "yjs";
import sharp from "sharp";
import { eq } from "drizzle-orm";

import { deckAssets, deckDocuments, decks, getDatabase } from "@mini-deck/db";
import { deriveViewToken, getDeckData } from "@mini-deck/deck";

import { GET as getAsset } from "@/app/api/assets/[assetId]/route";
import { POST as createDeckRoute } from "@/app/api/decks/route";
import { POST as uploadAsset } from "@/app/api/decks/[deckId]/assets/route";
import { POST as sessionRoute } from "@/app/api/decks/[deckId]/session/route";
import { GET as healthRoute } from "@/app/api/health/route";
import { getDeckCreateLimiter, resetRateLimitersForTests } from "@/server/rate-limit";
import { resetAssetStorageForTests } from "@/server/storage";
import { resetIntegrationState } from "../../../test/integration-helpers";

interface CreatedDeck {
  deckId: string;
  editToken: string;
  viewToken: string;
  title: string;
}

async function createTestDeck(ip = "127.0.0.1"): Promise<CreatedDeck> {
  const response = await createDeckRoute(
    new Request("http://localhost/api/decks", {
      method: "POST",
      headers: { "x-forwarded-for": ip },
    }),
  );
  expect(response.status).toBe(201);
  const data = (await response.json()) as {
    deckId: string;
    editToken: string;
    title: string;
  };
  return {
    ...data,
    viewToken: await deriveViewToken(data.editToken, data.deckId),
  };
}

function sessionRequest(deckId: string, token: string, ip = "127.0.0.1"): Request {
  return new Request(`http://localhost/api/decks/${deckId}/session`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "x-forwarded-for": ip },
  });
}

function params<T extends Record<string, string>>(value: T): { params: Promise<T> } {
  return { params: Promise.resolve(value) };
}

beforeEach(async () => {
  await resetIntegrationState();
  resetRateLimitersForTests();
  resetAssetStorageForTests();
});

describe("deck creation and session APIs", () => {
  it("creates a deck with hashed tokens and one initial slide", async () => {
    const created = await createTestDeck();
    const { db } = getDatabase();
    const rows = await db.select().from(decks).where(eq(decks.id, created.deckId));
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("Untitled deck");
    expect(rows[0].editTokenHash).not.toBe(created.editToken);
    expect(rows[0].viewTokenHash).not.toBe(created.viewToken);
    expect(rows[0].editTokenHash).toHaveLength(64);
    expect(rows[0].viewTokenHash).toHaveLength(64);

    const documents = await db
      .select()
      .from(deckDocuments)
      .where(eq(deckDocuments.deckId, created.deckId));
    expect(documents).toHaveLength(1);
    const doc = new Y.Doc();
    Y.applyUpdate(doc, documents[0].state);
    expect(getDeckData(doc).slides).toHaveLength(1);
    doc.destroy();
  });

  it("resolves edit and view roles without returning tokens", async () => {
    const created = await createTestDeck();
    const editorResponse = await sessionRoute(
      sessionRequest(created.deckId, created.editToken),
      params({ deckId: created.deckId }),
    );
    expect(editorResponse.status).toBe(200);
    const editorBody = await editorResponse.json();
    expect(editorBody).toEqual({ role: "editor", title: "Untitled deck" });
    expect(JSON.stringify(editorBody)).not.toContain(created.editToken);
    expect(editorResponse.headers.get("cache-control")).toBe("no-store");
    expect(editorResponse.headers.get("referrer-policy")).toBe("no-referrer");
    expect(editorResponse.headers.get("x-content-type-options")).toBe("nosniff");

    const viewerResponse = await sessionRoute(
      sessionRequest(created.deckId, created.viewToken),
      params({ deckId: created.deckId }),
    );
    expect(viewerResponse.status).toBe(200);
    expect(await viewerResponse.json()).toEqual({
      role: "viewer",
      title: "Untitled deck",
    });
  });

  it("returns a generic 404 for tampered and unknown links", async () => {
    const created = await createTestDeck();
    const tampered = await sessionRoute(
      sessionRequest(created.deckId, `${created.editToken.slice(0, -1)}x`),
      params({ deckId: created.deckId }),
    );
    expect(tampered.status).toBe(404);
    expect(await tampered.json()).toEqual({
      error: { code: "not_found", message: "Deck not found" },
    });

    const unknown = await sessionRoute(
      sessionRequest("does-not-exist", created.editToken),
      params({ deckId: "does-not-exist" }),
    );
    expect(unknown.status).toBe(404);
  });

  it("throttles deck creation by client address", async () => {
    const limiter = getDeckCreateLimiter();
    for (let index = 0; index < 1000; index += 1) limiter.take("rate-limited-ip");
    const response = await createDeckRoute(
      new Request("http://localhost/api/decks", {
        method: "POST",
        headers: { "x-forwarded-for": "rate-limited-ip" },
      }),
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeTruthy();
  });
});

describe("asset APIs", () => {
  async function imageFile(size = 32): Promise<File> {
    const buffer = await sharp({
      create: {
        width: size,
        height: size,
        channels: 3,
        background: { r: 240, g: 80, b: 40 },
      },
    })
      .png()
      .toBuffer();
    return new File([buffer], "test.png", { type: "image/png" });
  }

  it("uploads, stores, and serves an image", async () => {
    const created = await createTestDeck();
    const form = new FormData();
    form.set("file", await imageFile());

    const response = await uploadAsset(
      new Request(`http://localhost/api/decks/${created.deckId}/assets`, {
        method: "POST",
        headers: { authorization: `Bearer ${created.editToken}` },
        body: form,
      }),
      params({ deckId: created.deckId }),
    );
    expect(response.status).toBe(201);
    const payload = (await response.json()) as {
      asset: { id: string; url: string; width: number; height: number };
    };
    expect(payload.asset.url).toBe(`/api/assets/${payload.asset.id}`);
    expect(payload.asset.width).toBe(32);

    const { db } = getDatabase();
    const rows = await db
      .select()
      .from(deckAssets)
      .where(eq(deckAssets.id, payload.asset.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].deckId).toBe(created.deckId);

    const served = await getAsset(
      new Request(`http://localhost/api/assets/${payload.asset.id}`),
      params({ assetId: payload.asset.id }),
    );
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("image/png");
    expect(served.headers.get("cache-control")).toContain("immutable");
    expect(served.headers.get("x-content-type-options")).toBe("nosniff");
    expect(served.headers.get("referrer-policy")).toBe("no-referrer");
    expect((await served.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });

  it("rejects viewers, oversized files, SVGs, and corrupt data", async () => {
    const created = await createTestDeck();
    const viewerForm = new FormData();
    viewerForm.set("file", await imageFile());
    const viewerResponse = await uploadAsset(
      new Request(`http://localhost/api/decks/${created.deckId}/assets`, {
        method: "POST",
        headers: { authorization: `Bearer ${created.viewToken}` },
        body: viewerForm,
      }),
      params({ deckId: created.deckId }),
    );
    expect(viewerResponse.status).toBe(403);

    const oversizedForm = new FormData();
    oversizedForm.set(
      "file",
      new File([new Uint8Array(15 * 1024 * 1024)], "large.png", { type: "image/png" }),
    );
    const oversized = await uploadAsset(
      new Request(`http://localhost/api/decks/${created.deckId}/assets`, {
        method: "POST",
        headers: { authorization: `Bearer ${created.editToken}` },
        body: oversizedForm,
      }),
      params({ deckId: created.deckId }),
    );
    expect(oversized.status).toBe(413);
    const oversizedBody = (await oversized.json()) as {
      error: { code: string; message: string; details?: { maxMb?: number } };
    };
    expect(oversizedBody.error.code).toBe("image_too_large");
    expect(oversizedBody.error.details?.maxMb).toBe(10);
    expect(oversizedBody.error.message).toContain("10 MB");

    const svgForm = new FormData();
    svgForm.set("file", new File(["<svg></svg>"], "vector.svg", { type: "image/svg+xml" }));
    const svg = await uploadAsset(
      new Request(`http://localhost/api/decks/${created.deckId}/assets`, {
        method: "POST",
        headers: { authorization: `Bearer ${created.editToken}` },
        body: svgForm,
      }),
      params({ deckId: created.deckId }),
    );
    expect(svg.status).toBe(415);

    const corruptForm = new FormData();
    corruptForm.set(
      "file",
      new File([new Uint8Array([1, 2, 3, 4])], "broken.png", { type: "image/png" }),
    );
    const corrupt = await uploadAsset(
      new Request(`http://localhost/api/decks/${created.deckId}/assets`, {
        method: "POST",
        headers: { authorization: `Bearer ${created.editToken}` },
        body: corruptForm,
      }),
      params({ deckId: created.deckId }),
    );
    expect(corrupt.status).toBe(415);
  });

  it("returns 404 for unknown assets", async () => {
    const response = await getAsset(
      new Request("http://localhost/api/assets/unknown"),
      params({ assetId: "unknown" }),
    );
    expect(response.status).toBe(404);
  });
});

describe("health API", () => {
  it("reports healthy when the database responds", async () => {
    const response = await healthRoute();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
