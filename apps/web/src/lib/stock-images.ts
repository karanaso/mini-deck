export const STOCK_PROVIDERS = ["unsplash", "pexels"] as const;

export type StockProviderId = (typeof STOCK_PROVIDERS)[number];

export const STOCK_ORIENTATIONS = ["landscape", "portrait", "all"] as const;

export type StockOrientation = (typeof STOCK_ORIENTATIONS)[number];

export const STOCK_SEARCH_PAGE_SIZE = 24;

export interface StockPhotoSummary {
  id: string;
  provider: StockProviderId;
  thumbnailUrl: string;
  previewUrl: string;
  width: number;
  height: number;
  photographerName: string;
  photographerUrl: string;
  sourceUrl: string;
  alt: string;
  color?: string;
}

export interface StockSearchPage {
  results: StockPhotoSummary[];
  page: number;
  hasMore: boolean;
}

export interface StockPhotoSource extends StockPhotoSummary {
  downloadUrl: string;
}

export interface StockSearchInput {
  query: string;
  page: number;
  orientation: StockOrientation;
}

export function isStockProviderId(value: unknown): value is StockProviderId {
  return (
    typeof value === "string" &&
    (STOCK_PROVIDERS as readonly string[]).includes(value)
  );
}

export function isStockOrientation(value: unknown): value is StockOrientation {
  return (
    typeof value === "string" &&
    (STOCK_ORIENTATIONS as readonly string[]).includes(value)
  );
}
