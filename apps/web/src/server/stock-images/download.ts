import { ImageValidationError } from "../images";
import { StockProviderError } from "./errors";

export interface DownloadedImage {
  bytes: Uint8Array;
  mimeType: string;
}

const SUPPORTED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export async function downloadStockImage(
  url: string,
  allowedHosts: readonly string[],
  maxBytes: number,
  timeoutMs = 15_000,
): Promise<DownloadedImage> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !allowedHosts.includes(parsed.hostname)) {
    throw new ImageValidationError(
      "unsupported_image",
      "The provider image host is not allowed",
    );
  }

  let response: Response;
  try {
    response = await fetch(parsed.toString(), {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "error",
    });
  } catch (error) {
    throw new StockProviderError(
      "unavailable",
      "The provider image could not be downloaded",
      error,
    );
  }

  if (response.status === 429) {
    throw new StockProviderError("rate_limited", "The image provider is rate limited");
  }
  if (response.status === 404) {
    throw new StockProviderError("not_found", "The provider image was not found");
  }
  if (!response.ok) {
    throw new StockProviderError(
      "unavailable",
      `The provider image request returned ${response.status}`,
    );
  }

  const contentType = (response.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (!SUPPORTED_MIME_TYPES.has(contentType)) {
    throw new ImageValidationError(
      "unsupported_image",
      "Use a PNG, JPEG, or WebP image",
    );
  }

  const maxMb = Math.floor(maxBytes / (1024 * 1024));
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new ImageValidationError(
      "image_too_large",
      `Images must be ${maxMb} MB or smaller`,
      { maxMb },
    );
  }

  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) {
      throw new ImageValidationError(
        "image_too_large",
        `Images must be ${maxMb} MB or smaller`,
        { maxMb },
      );
    }
    return { bytes, mimeType: contentType };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new ImageValidationError(
          "image_too_large",
          `Images must be ${maxMb} MB or smaller`,
          { maxMb },
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes, mimeType: contentType };
}
