import type {
  StockProviderId,
  StockSearchInput,
  StockSearchPage,
  StockPhotoSource,
} from "@/lib/stock-images";

import { getServerEnv } from "../env";
import { pexelsProvider } from "./pexels";
import { unsplashProvider } from "./unsplash";

export interface StockProvider {
  readonly id: StockProviderId;
  readonly imageHosts: readonly string[];
  search(input: StockSearchInput, apiKey: string): Promise<StockSearchPage>;
  resolve(photoId: string, apiKey: string): Promise<StockPhotoSource>;
  trackDownload?(photoId: string, apiKey: string): Promise<void>;
}

const providers: Record<StockProviderId, StockProvider> = {
  unsplash: unsplashProvider,
  pexels: pexelsProvider,
};

export function getStockProvider(id: StockProviderId): StockProvider {
  return providers[id];
}

export function getStockProviderKey(id: StockProviderId): string {
  const env = getServerEnv();
  return id === "unsplash" ? env.UNSPLASH_ACCESS_KEY : env.PEXELS_API_KEY;
}

export function isStockProviderEnabled(id: StockProviderId): boolean {
  return getStockProviderKey(id).trim().length > 0;
}

export function getEnabledStockProviders(): StockProvider[] {
  return (Object.keys(providers) as StockProviderId[])
    .filter((id) => isStockProviderEnabled(id))
    .map((id) => providers[id]);
}

export function getEnabledStockProviderIds(): StockProviderId[] {
  return getEnabledStockProviders().map((provider) => provider.id);
}

export function getEnabledStockProvider(id: StockProviderId): StockProvider | null {
  return isStockProviderEnabled(id) ? getStockProvider(id) : null;
}
