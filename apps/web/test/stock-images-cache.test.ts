import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  STOCK_SEARCH_CACHE_TTL_MS,
  getCachedStockSearch,
  resetStockSearchCacheForTests,
  setCachedStockSearch,
  stockSearchCacheKey,
} from "@/server/stock-images/cache";
import {
  StockProviderError,
  stockProviderErrorResponse,
} from "@/server/stock-images/errors";
import { resetServerEnvForTests } from "@/server/env";
import {
  getImageImportLimiter,
  getImageSearchLimiter,
  resetRateLimitersForTests,
} from "@/server/rate-limit";

const originalEnv = { ...process.env };

const page = {
  results: [],
  page: 1,
  hasMore: false,
};

beforeEach(() => {
  resetStockSearchCacheForTests();
  resetServerEnvForTests();
  resetRateLimitersForTests();
});

afterEach(() => {
  process.env = { ...originalEnv };
  resetServerEnvForTests();
  resetRateLimitersForTests();
});

describe("stock search cache", () => {
  it("hits within the TTL and expires afterwards", () => {
    const now = 1_000;
    setCachedStockSearch("unsplash|mountain|1|landscape", page, now);
    expect(getCachedStockSearch("unsplash|mountain|1|landscape", now + 1)).toBe(page);
    expect(
      getCachedStockSearch(
        "unsplash|mountain|1|landscape",
        now + STOCK_SEARCH_CACHE_TTL_MS,
      ),
    ).toBeNull();
  });

  it("keys results by provider, normalized query, page, and orientation", () => {
    const base = {
      query: "Mountain",
      page: 1,
      orientation: "landscape" as const,
    };
    const key = stockSearchCacheKey("unsplash", base);
    expect(key).toBe("unsplash|mountain|1|landscape");
    expect(stockSearchCacheKey("pexels", base)).not.toBe(key);
    expect(stockSearchCacheKey("unsplash", { ...base, query: "Ocean" })).not.toBe(key);
    expect(stockSearchCacheKey("unsplash", { ...base, page: 2 })).not.toBe(key);
    expect(
      stockSearchCacheKey("unsplash", { ...base, orientation: "portrait" }),
    ).not.toBe(key);
  });
});

describe("stock rate limiters", () => {
  it("refuses requests above the configured capacity", () => {
    process.env.IMAGE_SEARCH_RATE_LIMIT = "2";
    process.env.IMAGE_IMPORT_RATE_LIMIT = "1";
    resetServerEnvForTests();
    resetRateLimitersForTests();

    const search = getImageSearchLimiter();
    expect(search.take("ip").allowed).toBe(true);
    expect(search.take("ip").allowed).toBe(true);
    expect(search.take("ip").allowed).toBe(false);

    const imported = getImageImportLimiter();
    expect(imported.take("ip").allowed).toBe(true);
    expect(imported.take("ip").allowed).toBe(false);
  });
});

describe("stock provider errors", () => {
  it("maps provider failures to API statuses", () => {
    expect(
      stockProviderErrorResponse(
        new StockProviderError("rate_limited", "busy"),
      ),
    ).toMatchObject({ status: 429, code: "provider_rate_limited" });
    expect(
      stockProviderErrorResponse(new StockProviderError("not_found", "missing")),
    ).toMatchObject({ status: 404, code: "provider_not_found" });
    expect(
      stockProviderErrorResponse(
        new StockProviderError("unavailable", "offline"),
      ),
    ).toMatchObject({ status: 502, code: "provider_unavailable" });
    expect(stockProviderErrorResponse(new Error("boom"))).toMatchObject({
      status: 502,
      code: "provider_unavailable",
    });
  });
});
