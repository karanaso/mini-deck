import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, messageForError } from "@/lib/api-error";
import {
  fetchStockProviders,
  importStockImage,
  resetStockProviderCacheForTests,
  searchStockImages,
} from "@/lib/stock-image-client";

beforeEach(() => {
  resetStockProviderCacheForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetStockProviderCacheForTests();
});

describe("fetchStockProviders", () => {
  it("returns enabled providers and caches the result", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ providers: ["unsplash", "pexels", "unknown"] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    expect(await fetchStockProviders()).toEqual(["unsplash", "pexels"]);
    expect(await fetchStockProviders()).toEqual(["unsplash", "pexels"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns an empty list when discovery fails structurally", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ providers: null })));
    expect(await fetchStockProviders()).toEqual([]);
  });
});

describe("searchStockImages", () => {
  it("sends the bearer token and encoded query parameters", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ results: [], page: 2, hasMore: true }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const page = await searchStockImages("deck-1", "edit-token", {
      provider: "unsplash",
      query: "mountain lake",
      page: 2,
      orientation: "landscape",
    });

    expect(page).toEqual({ results: [], page: 2, hasMore: true });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/api/decks/deck-1/image-search?");
    expect(url).toContain("q=mountain+lake");
    expect(url).toContain("page=2");
    expect(url).toContain("orientation=landscape");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer edit-token");
  });

  it("maps API failures to localized messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            error: {
              code: "provider_unavailable",
              message: "The image provider is unavailable",
            },
          },
          { status: 502 },
        ),
      ),
    );

    const error = await searchStockImages("deck-1", "token", {
      provider: "unsplash",
      query: "ocean",
      page: 1,
      orientation: "landscape",
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(502);
    expect(messageForError(error).key).toBe("errors.api.provider_unavailable");
  });
});

describe("importStockImage", () => {
  it("posts only the provider and photo id with the bearer token", async () => {
    const payload = {
      asset: {
        id: "asset-1",
        url: "/api/assets/asset-1",
        mimeType: "image/jpeg",
        width: 1920,
        height: 1080,
      },
      credit: {
        provider: "unsplash",
        photographerName: "Ada Lovelace",
        photographerUrl: "https://unsplash.com/@ada",
        sourceUrl: "https://unsplash.com/photos/1",
      },
    };
    const fetchMock = vi.fn(async () => Response.json(payload, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await importStockImage("deck-1", "token", {
      provider: "unsplash",
      photoId: "photo-1",
    });

    expect(result).toEqual(payload);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/decks/deck-1/image-search/import");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      provider: "unsplash",
      photoId: "photo-1",
    });
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer token");
  });
});
