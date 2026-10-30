export type StockProviderErrorKind =
  | "rate_limited"
  | "unavailable"
  | "not_found";

export class StockProviderError extends Error {
  readonly kind: StockProviderErrorKind;

  constructor(kind: StockProviderErrorKind, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "StockProviderError";
    this.kind = kind;
  }
}

export interface StockProviderErrorResponse {
  status: number;
  code: string;
  message: string;
}

export function stockProviderErrorResponse(
  error: unknown,
): StockProviderErrorResponse {
  if (error instanceof StockProviderError) {
    if (error.kind === "rate_limited") {
      return {
        status: 429,
        code: "provider_rate_limited",
        message: "The image provider is busy. Try again shortly.",
      };
    }
    if (error.kind === "not_found") {
      return {
        status: 404,
        code: "provider_not_found",
        message: "That photo is no longer available",
      };
    }
  }
  return {
    status: 502,
    code: "provider_unavailable",
    message: "The image provider is unavailable",
  };
}

export async function providerFetch(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new StockProviderError(
      "unavailable",
      "The image provider could not be reached",
      error,
    );
  }

  if (response.status === 429) {
    throw new StockProviderError("rate_limited", "The image provider is rate limited");
  }
  if (response.status === 404) {
    throw new StockProviderError("not_found", "The requested photo was not found");
  }
  if (!response.ok) {
    throw new StockProviderError(
      "unavailable",
      `The image provider returned ${response.status}`,
    );
  }
  return response;
}
