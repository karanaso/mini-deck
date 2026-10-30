import type {
  StockProviderId,
  StockSearchInput,
  StockSearchPage,
} from "@/lib/stock-images";

export const STOCK_SEARCH_CACHE_TTL_MS = 60_000;
const MAX_ENTRIES = 100;

interface CacheEntry {
  value: StockSearchPage;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export function stockSearchCacheKey(
  provider: StockProviderId,
  input: Pick<StockSearchInput, "query" | "page" | "orientation">,
): string {
  return [
    provider,
    input.query.trim().toLocaleLowerCase("en-US"),
    input.page,
    input.orientation,
  ].join("|");
}

export function getCachedStockSearch(
  key: string,
  now = Date.now(),
): StockSearchPage | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    cache.delete(key);
    return null;
  }
  // Refresh recency for the small LRU.
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

export function setCachedStockSearch(
  key: string,
  value: StockSearchPage,
  now = Date.now(),
): void {
  if (cache.size >= MAX_ENTRIES && !cache.has(key)) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.delete(key);
  cache.set(key, {
    value,
    expiresAt: now + STOCK_SEARCH_CACHE_TTL_MS,
  });
}

export function resetStockSearchCacheForTests(): void {
  cache.clear();
}
