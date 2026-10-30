import {
  STOCK_SEARCH_PAGE_SIZE,
  type StockPhotoSource,
  type StockSearchPage,
} from "@/lib/stock-images";

import { providerFetch } from "./errors";

export const UNSPLASH_API_URL = "https://api.unsplash.com";
export const UNSPLASH_IMAGE_HOSTS = ["images.unsplash.com", "plus.unsplash.com"] as const;
export const UNSPLASH_TIMEOUT_MS = 5_000;
export const UNSPLASH_IMPORT_TIMEOUT_MS = 15_000;

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

export function mapUnsplashSearch(
  payload: unknown,
  page: number,
): StockSearchPage {
  const root = record(payload);
  const rawResults = root?.results;
  const total = positiveNumber(root?.total) ?? 0;
  const results = Array.isArray(rawResults)
    ? rawResults
        .map((entry) => mapUnsplashPhoto(entry))
        .filter((entry): entry is StockPhotoSource => entry !== null)
        .map(({ downloadUrl: _downloadUrl, ...summary }) => summary)
    : [];

  return {
    results,
    page,
    hasMore: total > page * STOCK_SEARCH_PAGE_SIZE,
  };
}

export function mapUnsplashPhoto(payload: unknown): StockPhotoSource | null {
  const root = record(payload);
  const id = text(root?.id);
  const urls = record(root?.urls);
  const user = record(root?.user);
  const links = record(root?.links);
  const userLinks = record(user?.links);
  const previewUrl = secureUrl(urls?.regular) ?? secureUrl(urls?.small);
  const thumbnailUrl = secureUrl(urls?.small) ?? secureUrl(urls?.thumb);
  const downloadUrl = secureUrl(urls?.full) ?? secureUrl(urls?.regular);
  const photographerName = text(user?.name);
  const photographerUrl = secureUrl(userLinks?.html);
  const sourceUrl = secureUrl(links?.html);
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
    provider: "unsplash",
    thumbnailUrl,
    previewUrl,
    downloadUrl,
    width,
    height,
    photographerName,
    photographerUrl,
    sourceUrl,
    alt: text(root?.alt_description) ?? text(root?.description) ?? "",
    color: text(root?.color) ?? undefined,
  };
}

export const unsplashProvider = {
  id: "unsplash" as const,
  imageHosts: UNSPLASH_IMAGE_HOSTS,
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
      `${UNSPLASH_API_URL}/search/photos?${params.toString()}`,
      {
        headers: {
          Authorization: `Client-ID ${apiKey}`,
          "Accept-Version": "v1",
        },
      },
      UNSPLASH_TIMEOUT_MS,
    );
    return mapUnsplashSearch(await response.json(), input.page);
  },

  async resolve(photoId: string, apiKey: string): Promise<StockPhotoSource> {
    const response = await providerFetch(
      `${UNSPLASH_API_URL}/photos/${encodeURIComponent(photoId)}`,
      {
        headers: {
          Authorization: `Client-ID ${apiKey}`,
          "Accept-Version": "v1",
        },
      },
      UNSPLASH_IMPORT_TIMEOUT_MS,
    );
    const photo = mapUnsplashPhoto(await response.json());
    if (!photo) {
      throw new Error("Invalid Unsplash photo response");
    }
    return photo;
  },

  async trackDownload(photoId: string, apiKey: string): Promise<void> {
    await providerFetch(
      `${UNSPLASH_API_URL}/photos/${encodeURIComponent(photoId)}/download`,
      {
        headers: {
          Authorization: `Client-ID ${apiKey}`,
          "Accept-Version": "v1",
        },
      },
      UNSPLASH_IMPORT_TIMEOUT_MS,
    );
  },
};
