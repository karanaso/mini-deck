import { MAX_IMAGE_BYTES } from "@mini-deck/deck";

import { ApiError, parseApiError } from "@/lib/api-error";
import { AppError } from "@/lib/app-error";

export interface UploadedAsset {
  id: string;
  url: string;
  mimeType: string;
  width: number;
  height: number;
}

const SUPPORTED = new Set(["image/png", "image/jpeg", "image/webp"]);

export type ImageValidationKey =
  | "errors.image.unsupported"
  | "errors.image.tooLarge";

export function maxImageMb(): number {
  return Math.floor(MAX_IMAGE_BYTES / (1024 * 1024));
}

export function validateImageFile(file: File): ImageValidationKey | null {
  if (!SUPPORTED.has(file.type)) return "errors.image.unsupported";
  if (file.size > MAX_IMAGE_BYTES) return "errors.image.tooLarge";
  return null;
}

export async function uploadImage(
  deckId: string,
  token: string,
  file: File,
): Promise<UploadedAsset> {
  const invalid = validateImageFile(file);
  if (invalid) {
    throw new AppError(invalid, "Invalid image file");
  }

  const form = new FormData();
  form.set("file", file);
  let response: Response;
  try {
    response = await fetch(`/api/decks/${encodeURIComponent(deckId)}/assets`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch (error) {
    throw new ApiError(
      "network",
      0,
      "The image upload could not be completed",
      {},
      error,
    );
  }
  if (!response.ok) {
    throw await parseApiError(response);
  }
  const data = (await response.json()) as { asset: UploadedAsset };
  return data.asset;
}
