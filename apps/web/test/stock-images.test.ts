import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getEnabledStockProviderIds,
  isStockProviderEnabled,
} from "@/server/stock-images";
import { resetServerEnvForTests } from "@/server/env";
import {
  mapPexelsPhoto,
  mapPexelsSearch,
} from "@/server/stock-images/pexels";
import {
  mapUnsplashPhoto,
  mapUnsplashSearch,
} from "@/server/stock-images/unsplash";

const originalEnv = { ...process.env };

function setProviderKeys(unsplash?: string, pexels?: string): void {
  resetServerEnvForTests();
  if (unsplash === undefined) delete process.env.UNSPLASH_ACCESS_KEY;
  else process.env.UNSPLASH_ACCESS_KEY = unsplash;
  if (pexels === undefined) delete process.env.PEXELS_API_KEY;
  else process.env.PEXELS_API_KEY = pexels;
  resetServerEnvForTests();
}

beforeEach(() => {
  setProviderKeys();
});

afterEach(() => {
  process.env = { ...originalEnv };
  resetServerEnvForTests();
});

describe("stock provider enablement", () => {
  it("enables only providers with a non-empty key", () => {
    expect(getEnabledStockProviderIds()).toEqual([]);
    expect(isStockProviderEnabled("unsplash")).toBe(false);

    setProviderKeys("unsplash-key", "  ");
    expect(getEnabledStockProviderIds()).toEqual(["unsplash"]);
    expect(isStockProviderEnabled("unsplash")).toBe(true);
    expect(isStockProviderEnabled("pexels")).toBe(false);

    setProviderKeys("unsplash-key", "pexels-key");
    expect(getEnabledStockProviderIds()).toEqual(["unsplash", "pexels"]);
  });
});

describe("unsplash mapping", () => {
  const result = {
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
    alt_description: "A mountain at sunrise",
    color: "#112233",
  };

  it("normalizes a search page and pagination", () => {
    const page = mapUnsplashSearch({ total: 50, results: [result] }, 1);
    expect(page.page).toBe(1);
    expect(page.hasMore).toBe(true);
    expect(page.results[0]).toEqual({
      id: "photo-1",
      provider: "unsplash",
      thumbnailUrl: "https://images.unsplash.com/photo-1-small",
      previewUrl: "https://images.unsplash.com/photo-1-regular",
      width: 4000,
      height: 3000,
      photographerName: "Ada Lovelace",
      photographerUrl: "https://unsplash.com/@ada",
      sourceUrl: "https://unsplash.com/photos/photo-1",
      alt: "A mountain at sunrise",
      color: "#112233",
    });
    expect(mapUnsplashSearch({ total: 50, results: [result] }, 3).hasMore).toBe(false);
  });

  it("normalizes a single photo and rejects malformed data", () => {
    expect(mapUnsplashPhoto(result)).toMatchObject({
      id: "photo-1",
      downloadUrl: "https://images.unsplash.com/photo-1-full",
      provider: "unsplash",
    });

    expect(mapUnsplashSearch({ results: [{}] }, 1).results).toEqual([]);
    expect(mapUnsplashSearch({ results: "nope" }, 1)).toMatchObject({
      results: [],
      hasMore: false,
    });
    expect(mapUnsplashPhoto({ ...result, urls: { full: "http://insecure" } })).toBeNull();
    expect(mapUnsplashPhoto({ ...result, width: "wide" })).toBeNull();
  });
});

describe("pexels mapping", () => {
  const photo = {
    id: 12345,
    width: 1920,
    height: 1080,
    url: "https://www.pexels.com/photo/12345",
    photographer: "Grace Hopper",
    photographer_url: "https://www.pexels.com/@grace",
    avg_color: "#445566",
    alt: "Ocean waves",
    src: {
      small: "https://images.pexels.com/photos/12345/small",
      medium: "https://images.pexels.com/photos/12345/medium",
      large: "https://images.pexels.com/photos/12345/large",
      large2x: "https://images.pexels.com/photos/12345/large2x",
      original: "https://images.pexels.com/photos/12345/original",
    },
  };

  it("normalizes a search page and pagination", () => {
    const page = mapPexelsSearch({ total_results: 30, photos: [photo] }, 1);
    expect(page.hasMore).toBe(true);
    expect(page.results[0]).toEqual({
      id: "12345",
      provider: "pexels",
      thumbnailUrl: "https://images.pexels.com/photos/12345/medium",
      previewUrl: "https://images.pexels.com/photos/12345/large",
      width: 1920,
      height: 1080,
      photographerName: "Grace Hopper",
      photographerUrl: "https://www.pexels.com/@grace",
      sourceUrl: "https://www.pexels.com/photo/12345",
      alt: "Ocean waves",
      color: "#445566",
    });
  });

  it("normalizes a single photo and rejects malformed data", () => {
    expect(mapPexelsPhoto(photo)).toMatchObject({
      id: "12345",
      downloadUrl: "https://images.pexels.com/photos/12345/large2x",
      provider: "pexels",
    });
    expect(mapPexelsSearch({ photos: [{ id: 1 }] }, 1).results).toEqual([]);
    expect(mapPexelsPhoto({ ...photo, photographer: "" })).toBeNull();
    expect(mapPexelsPhoto({ ...photo, src: { large: "ftp://nope" } })).toBeNull();
  });
});
