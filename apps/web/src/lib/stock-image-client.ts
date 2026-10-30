import type { ImageCredit } from "@mini-deck/deck";

import { ApiError, parseApiError } from "@/lib/api-error";
import type {
  StockOrientation,
  StockProviderId,
  StockSearchPage,
} from "@/lib/stock-images";
import { STOCK_PROVIDERS } from "@/lib/stock-images";
import type { UploadedAsset } from "@/lib/upload";

let providerCache: StockProviderId[] | null = null;

export async function fetchStockProviders(
  options: { refresh?: boolean } = {},
): Promise<StockProviderId[]> {
  if (providerCache && !options.refresh) return providerCache;
  let response: Response;
  try {
    response = await fetch("/api/image-search/providers");
  } catch (error) {
    throw new ApiError(
      "network",
      0,
      "The image providers could not be loaded",
      {},
      error,
    );
  }
  if (!response.ok) throw await parseApiError(response);
  const data = (await response.json()) as { providers?: unknown };
  const providers = Array.isArray(data.providers)
    ? data.providers.filter((provider): provider is StockProviderId =>
        (STOCK_PROVIDERS as readonly string[]).includes(String(provider)),
      )
    : [];
  providerCache = providers;
  return providers;
}

export function resetStockProviderCacheForTests(): void {
  providerCache = null;
}

export interface SearchStockImagesInput {
  provider: StockProviderId;
  query: string;
  page: number;
  orientation: StockOrientation;
}

export async function searchStockImages(
  deckId: string,
  token: string,
  input: SearchStockImagesInput,
): Promise<StockSearchPage> {
  const params = new URLSearchParams({
    provider: input.provider,
    q: input.query,
    page: String(input.page),
    orientation: input.orientation,
  });
  let response: Response;
  try {
    response = await fetch(
      `/api/decks/${encodeURIComponent(deckId)}/image-search?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } catch (error) {
    throw new ApiError("network", 0, "The image search could not be completed", {}, error);
  }
  if (!response.ok) throw await parseApiError(response);
  const data = (await response.json()) as Partial<StockSearchPage>;
  return {
    results: Array.isArray(data.results) ? data.results : [],
    page: typeof data.page === "number" ? data.page : input.page,
    hasMore: Boolean(data.hasMore),
  };
}

export interface ImportStockImageResult {
  asset: UploadedAsset;
  credit: ImageCredit;
}

export async function importStockImage(
  deckId: string,
  token: string,
  input: { provider: StockProviderId; photoId: string },
): Promise<ImportStockImageResult> {
  let response: Response;
  try {
    response = await fetch(
      `/api/decks/${encodeURIComponent(deckId)}/image-search/import`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      },
    );
  } catch (error) {
    throw new ApiError("network", 0, "The image import could not be completed", {}, error);
  }
  if (!response.ok) throw await parseApiError(response);
  return (await response.json()) as ImportStockImageResult;
}
