import {
  STOCK_SEARCH_PAGE_SIZE,
  type StockPhotoSource,
  type StockSearchPage,
} from "@/lib/stock-images";

import { providerFetch } from "./errors";

export const PEXELS_API_URL = "https://api.pexels.com";
export const PEXELS_IMAGE_HOSTS = ["images.pexels.com"] as const;
export const PEXELS_TIMEOUT_MS = 5_000;
export const PEXELS_IMPORT_TIMEOUT_MS = 15_000;

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" ? (value as JsonRecord) : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function secureUrl(value: unknown): string | null {
  const candidate = text(value);
  if (!candidate) return null;
  try {
    return new URL(candidate).protocol === "https:" ? candidate : null;
  } catch {
    return null;
  }
}

function positiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

export function mapPexelsSearch(
  payload: unknown,
  page: number,
): StockSearchPage {
  const root = record(payload);
  const rawPhotos = root?.photos;
  const total = positiveNumber(root?.total_results) ?? 0;
  const results = Array.isArray(rawPhotos)
    ? rawPhotos
        .map((entry) => mapPexelsPhoto(entry))
        .filter((entry): entry is StockPhotoSource => entry !== null)
        .map(({ downloadUrl: _downloadUrl, ...summary }) => summary)
    : [];

  return {
    results,
    page,
    hasMore: total > page * STOCK_SEARCH_PAGE_SIZE,
  };
}

export function mapPexelsPhoto(payload: unknown): StockPhotoSource | null {
  const root = record(payload);
  const idValue = root?.id;
  const id =
    typeof idValue === "number" && Number.isFinite(idValue)
      ? String(idValue)
      : text(idValue);
  const src = record(root?.src);
  const previewUrl = secureUrl(src?.large) ?? secureUrl(src?.medium);
  const thumbnailUrl = secureUrl(src?.medium) ?? secureUrl(src?.small);
  const downloadUrl = secureUrl(src?.large2x) ?? secureUrl(src?.original);
  const photographerName = text(root?.photographer);
  const photographerUrl = secureUrl(root?.photographer_url);
  const sourceUrl = secureUrl(root?.url);
  const width = positiveNumber(root?.width);
  const height = positiveNumber(root?.height);

  if (
    !id ||
    !previewUrl ||
    !thumbnailUrl ||
    !downloadUrl ||
    !photographerName ||
    !photographerUrl ||
    !sourceUrl ||
    !width ||
    !height
  ) {
    return null;
  }

  return {
    id,
    provider: "pexels",
    thumbnailUrl,
    previewUrl,
    downloadUrl,
    width,
    height,
    photographerName,
    photographerUrl,
    sourceUrl,
    alt: text(root?.alt) ?? "",
    color: text(root?.avg_color) ?? undefined,
  };
}

export const pexelsProvider = {
  id: "pexels" as const,
  imageHosts: PEXELS_IMAGE_HOSTS,
  async search(
    input: { query: string; page: number; orientation: "landscape" | "portrait" | "all" },
    apiKey: string,
  ): Promise<StockSearchPage> {
    const params = new URLSearchParams({
      query: input.query,
      page: String(input.page),
      per_page: String(STOCK_SEARCH_PAGE_SIZE),
    });
    if (input.orientation !== "all") {
      params.set("orientation", input.orientation);
    }

    const response = await providerFetch(
      `${PEXELS_API_URL}/v1/search?${params.toString()}`,
      { headers: { Authorization: apiKey } },
      PEXELS_TIMEOUT_MS,
    );
    return mapPexelsSearch(await response.json(), input.page);
  },

  async resolve(photoId: string, apiKey: string): Promise<StockPhotoSource> {
    const response = await providerFetch(
      `${PEXELS_API_URL}/v1/photos/${encodeURIComponent(photoId)}`,
      { headers: { Authorization: apiKey } },
      PEXELS_IMPORT_TIMEOUT_MS,
    );
    const photo = mapPexelsPhoto(await response.json());
    if (!photo) {
      throw new Error("Invalid Pexels photo response");
    }
    return photo;
  },
};
