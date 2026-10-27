import { describe, expect, it } from "vitest";

import {
  ApiError,
  getApiErrorKey,
  messageForError,
  parseApiError,
} from "@/lib/api-error";

function errorResponse(
  body: unknown,
  status = 400,
  contentType = "application/json",
): Response {
  return new Response(
    typeof body === "string" ? body : JSON.stringify(body),
    { status, headers: { "content-type": contentType } },
  );
}

describe("API error localization", () => {
  it("maps known codes to localized keys and keeps details", async () => {
    const error = await parseApiError(
      errorResponse({
        error: {
          code: "image_too_large",
          message: "Images must be 10 MB or smaller",
          details: { maxMb: 10 },
        },
      }),
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe("image_too_large");
    expect(error.status).toBe(400);
    expect(error.details).toEqual({ maxMb: 10 });
    expect(error.messageKey).toBe("errors.api.image_too_large");
    expect(messageForError(error)).toEqual({
      key: "errors.api.image_too_large",
      params: { maxMb: 10 },
    });
  });

  it("falls back to the generic key for unknown codes", async () => {
    const error = await parseApiError(
      errorResponse({ error: { code: "brand_new_failure", message: "Nope" } }, 500),
    );
    expect(error.messageKey).toBe("errors.api.generic");
    expect(messageForError(error).key).toBe("errors.api.generic");
  });

  it("handles non-JSON responses without leaking their body", async () => {
    const error = await parseApiError(
      errorResponse("Internal Server Error", 503, "text/plain"),
    );
    expect(error.code).toBe("unknown");
    expect(error.messageKey).toBe("errors.api.generic");
    expect(error.message).toContain("503");
  });

  it("maps network failures to the localized network key", () => {
    const error = new ApiError("network", 0, "fetch failed");
    expect(getApiErrorKey("network")).toBe("errors.api.network");
    expect(messageForError(error)).toEqual({
      key: "errors.api.network",
      params: {},
    });
  });

  it("returns a localized fallback for unknown thrown values", () => {
    expect(messageForError(new Error("boom"), "errors.openDeck")).toEqual({
      key: "errors.openDeck",
    });
    expect(messageForError("boom")).toEqual({ key: "errors.api.generic" });
  });
});
