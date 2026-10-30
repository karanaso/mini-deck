import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import sharp from "sharp";

import { deckAssets, getDatabase } from "@mini-deck/db";

import { GET as searchImages } from "@/app/api/decks/[deckId]/image-search/route";
import { POST as importImage } from "@/app/api/decks/[deckId]/image-search/import/route";
import { resetServerEnvForTests } from "@/server/env";
import { resetRateLimitersForTests } from "@/server/rate-limit";
import { resetStockSearchCacheForTests } from "@/server/stock-images/cache";
import { resetAssetStorageForTests } from "@/server/storage";
import { resetIntegrationState } from "../../../test/integration-helpers";
import { createProtectedDeck, unlockDeck } from "./access-helpers";

interface CreatedDeck {
  deckId: string;
  editToken: string;
  viewToken: string;
}

const originalEnv = { ...process.env };

const unsplashResult = {
  id: "photo-1",
  urls: {
    thumb: "https://images.unsplash.com/photo-1-thumb",
    small: "https://images.unsplash.com/photo-1-small",
    regular: "https://images.unsplash.com/photo-1-regular",
    full: "https://images.unsplash.com/photo-1-full",
  },
  user: {
    name: "Ada Lovelace",
    links: { html: "https://unsplash.com/@ada" },
  },
  links: { html: "https://unsplash.com/photos/photo-1" },
  width: 4000,
  height: 3000,
  alt_description: "A mountain",
};

async function createTestDeck(): Promise<CreatedDeck> {
  const deck = await createProtectedDeck();
  const editor = await unlockDeck(deck.deckId, deck.editToken, deck.editPin);
  const viewer = await unlockDeck(deck.deckId, deck.viewToken, deck.viewPin);
  return {
    deckId: deck.deckId,
    editToken: editor.unlockToken,
    viewToken: viewer.unlockToken,
  };
}

function params<T extends Record<string, string>>(value: T): { params: Promise<T> } {
  return { params: Promise.resolve(value) };
}

function searchRequest(
  deckId: string,
  query: string,
  token: string,
  ip = "127.0.0.1",
): Request {
  return new Request(
    `http://localhost/api/decks/${deckId}/image-search?${query}`,
    { headers: { authorization: `Bearer ${token}`, "x-forwarded-for": ip } },
  );
}

function importRequest(
  deckId: string,
  token: string,
  body: unknown,
  ip = "127.0.0.1",
): Request {
  return new Request(
    `http://localhost/api/decks/${deckId}/image-search/import`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-forwarded-for": ip,
      },
      body: JSON.stringify(body),
    },
  );
}

async function jpegBytes(width = 64, height = 48): Promise<Uint8Array> {
  const buffer = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 20, g: 120, b: 220 },
    },
  })
    .jpeg()
    .toBuffer();
  return new Uint8Array(buffer);
}

beforeEach(async () => {
  await resetIntegrationState();
  resetRateLimitersForTests();
  resetStockSearchCacheForTests();
  resetAssetStorageForTests();
  process.env.UNSPLASH_ACCESS_KEY = "unsplash-secret";
  delete process.env.PEXELS_API_KEY;
  process.env.IMAGE_SEARCH_RATE_LIMIT = "1000";
  resetServerEnvForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
  resetServerEnvForTests();
  resetRateLimitersForTests();
});

describe("GET /api/decks/[deckId]/image-search", () => {
  it("returns normalized results for an editor", async () => {
    const deck = await createTestDeck();
    const fetchMock = vi.fn(async () =>
      Response.json({ total: 1, results: [unsplashResult] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await searchImages(
      searchRequest(
        deck.deckId,
        "provider=unsplash&q=mountain&page=1&orientation=landscape",
        deck.editToken,
      ),
      params({ deckId: deck.deckId }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      provider: "unsplash",
      query: "mountain",
      page: 1,
      hasMore: false,
    });
    expect(body.results[0]).toMatchObject({
      id: "photo-1",
      photographerName: "Ada Lovelace",
    });
    expect(JSON.stringify(body)).not.toContain("unsplash-secret");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(new Headers(init.headers).get("authorization")).toBe(
      "Client-ID unsplash-secret",
    );
  });

  it("requires an editor token", async () => {
    const deck = await createTestDeck();
    vi.stubGlobal("fetch", vi.fn());

    const viewer = await searchImages(
      searchRequest(deck.deckId, "provider=unsplash&q=mountain", deck.viewToken, "10.0.0.2"),
      params({ deckId: deck.deckId }),
    );
    expect(viewer.status).toBe(403);

    const anonymous = await searchImages(
      searchRequest(deck.deckId, "provider=unsplash&q=mountain", "not-a-token", "10.0.0.3"),
      params({ deckId: deck.deckId }),
    );
    expect(anonymous.status).toBe(404);
  });

  it("rejects invalid input and unconfigured providers", async () => {
    const deck = await createTestDeck();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const invalid = await searchImages(
      searchRequest(deck.deckId, "provider=unsplash", deck.editToken),
      params({ deckId: deck.deckId }),
    );
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({
      error: { code: "invalid_request" },
    });

    const disabled = await searchImages(
      searchRequest(deck.deckId, "provider=pexels&q=ocean", deck.editToken),
      params({ deckId: deck.deckId }),
    );
    expect(disabled.status).toBe(400);
    expect(await disabled.json()).toMatchObject({
      error: { code: "provider_not_configured" },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps upstream timeouts and rate limits", async () => {
    const deck = await createTestDeck();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("timed out", "TimeoutError");
      }),
    );

    const timeout = await searchImages(
      searchRequest(deck.deckId, "provider=unsplash&q=mountain", deck.editToken, "10.0.0.4"),
      params({ deckId: deck.deckId }),
    );
    expect(timeout.status).toBe(502);
    expect(await timeout.json()).toMatchObject({
      error: { code: "provider_unavailable" },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("busy", { status: 429 })),
    );
    const limited = await searchImages(
      searchRequest(deck.deckId, "provider=unsplash&q=ocean", deck.editToken, "10.0.0.5"),
      params({ deckId: deck.deckId }),
    );
    expect(limited.status).toBe(429);
    expect(await limited.json()).toMatchObject({
      error: { code: "provider_rate_limited" },
    });
  });

  it("rate limits repeat searches", async () => {
    const deck = await createTestDeck();
    process.env.IMAGE_SEARCH_RATE_LIMIT = "1";
    resetServerEnvForTests();
    resetRateLimitersForTests();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ total: 0, results: [] })),
    );

    const first = await searchImages(
      searchRequest(deck.deckId, "provider=unsplash&q=one", deck.editToken, "10.0.0.6"),
      params({ deckId: deck.deckId }),
    );
    expect(first.status).toBe(200);

    const second = await searchImages(
      searchRequest(deck.deckId, "provider=unsplash&q=two", deck.editToken, "10.0.0.6"),
      params({ deckId: deck.deckId }),
    );
    expect(second.status).toBe(429);
    expect(second.headers.get("retry-after")).toBeTruthy();
  });

  it("serves repeated identical searches from cache", async () => {
    const deck = await createTestDeck();
    const fetchMock = vi.fn(async () =>
      Response.json({ total: 1, results: [unsplashResult] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    for (let index = 0; index < 2; index += 1) {
      const response = await searchImages(
        searchRequest(deck.deckId, "provider=unsplash&q=mountain", deck.editToken),
        params({ deckId: deck.deckId }),
      );
      expect(response.status).toBe(200);
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/decks/[deckId]/image-search/import", () => {
  it("downloads, stores, and returns the asset plus credit", async () => {
    const deck = await createTestDeck();
    const bytes = await jpegBytes();
    const urls: string[] = [];
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      urls.push(url);
      if (url.includes("/download")) return new Response(null, { status: 200 });
      if (url === "https://api.unsplash.com/photos/photo-1") {
        return Response.json(unsplashResult);
      }
      if (url === "https://images.unsplash.com/photo-1-full") {
        return new Response(bytes, {
          headers: {
            "content-type": "image/jpeg",
            "content-length": String(bytes.byteLength),
          },
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await importImage(
      importRequest(deck.deckId, deck.editToken, {
        provider: "unsplash",
        photoId: "photo-1",
      }),
      params({ deckId: deck.deckId }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.asset).toMatchObject({ mimeType: "image/jpeg", width: 64, height: 48 });
    expect(body.credit).toEqual({
      provider: "unsplash",
      photographerName: "Ada Lovelace",
      photographerUrl: "https://unsplash.com/@ada",
      sourceUrl: "https://unsplash.com/photos/photo-1",
    });

    const { db } = getDatabase();
    const rows = await db
      .select()
      .from(deckAssets)
      .where(eq(deckAssets.id, body.asset.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].deckId).toBe(deck.deckId);

    expect(urls).toContain("https://api.unsplash.com/photos/photo-1/download");
  });

  it("rejects URL-shaped identifiers before fetching anything", async () => {
    const deck = await createTestDeck();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await importImage(
      importRequest(deck.deckId, deck.editToken, {
        provider: "unsplash",
        photoId: "https://evil.example/photo.jpg",
      }),
      params({ deckId: deck.deckId }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "invalid_request" },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects viewers and unconfigured providers", async () => {
    const deck = await createTestDeck();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const viewer = await importImage(
      importRequest(
        deck.deckId,
        deck.viewToken,
        { provider: "unsplash", photoId: "photo-1" },
        "10.0.1.2",
      ),
      params({ deckId: deck.deckId }),
    );
    expect(viewer.status).toBe(403);

    const disabled = await importImage(
      importRequest(deck.deckId, deck.editToken, {
        provider: "pexels",
        photoId: "12345",
      }),
      params({ deckId: deck.deckId }),
    );
    expect(disabled.status).toBe(400);
    expect(await disabled.json()).toMatchObject({
      error: { code: "provider_not_configured" },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects oversized provider images without creating an asset", async () => {
    const deck = await createTestDeck();
    process.env.MAX_IMAGE_BYTES = "1024";
    resetServerEnvForTests();
    const bytes = new Uint8Array(2048);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url === "https://api.unsplash.com/photos/photo-1") {
          return Response.json(unsplashResult);
        }
        return new Response(bytes, {
          headers: {
            "content-type": "image/jpeg",
            "content-length": String(bytes.byteLength),
          },
        });
      }),
    );

    const response = await importImage(
      importRequest(deck.deckId, deck.editToken, {
        provider: "unsplash",
        photoId: "photo-1",
      }),
      params({ deckId: deck.deckId }),
    );

    expect(response.status).toBe(413);
    const body = await response.json();
    expect(body.error.code).toBe("image_too_large");

    const { db } = getDatabase();
    const rows = await db.select().from(deckAssets);
    expect(rows).toHaveLength(0);
  });

  it("fails closed on unapproved image hosts and provider errors", async () => {
    const deck = await createTestDeck();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url === "https://api.unsplash.com/photos/photo-1") {
          return Response.json({
            ...unsplashResult,
            urls: {
              ...unsplashResult.urls,
              full: "https://evil.example/photo.jpg",
            },
          });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    const unsafe = await importImage(
      importRequest(deck.deckId, deck.editToken, {
        provider: "unsplash",
        photoId: "photo-1",
      }),
      params({ deckId: deck.deckId }),
    );
    expect(unsafe.status).toBe(415);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("offline", { status: 503 })),
    );
    const unavailable = await importImage(
      importRequest(deck.deckId, deck.editToken, {
        provider: "unsplash",
        photoId: "photo-1",
      }),
      params({ deckId: deck.deckId }),
    );
    expect(unavailable.status).toBe(502);
    expect(await unavailable.json()).toMatchObject({
      error: { code: "provider_unavailable" },
    });
  });
});
