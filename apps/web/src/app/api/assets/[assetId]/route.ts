import { eq } from "drizzle-orm";

import { deckAssets, getDatabase } from "@mini-deck/db";

import { apiError } from "@/server/api";
import { getAssetStorage } from "@/server/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ assetId: string }> },
): Promise<Response> {
  const { assetId } = await context.params;
  const { db } = getDatabase();
  const rows = await db
    .select()
    .from(deckAssets)
    .where(eq(deckAssets.id, assetId))
    .limit(1);
  const asset = rows[0];
  if (!asset) return apiError(404, "not_found", "Asset not found");

  let bytes: Uint8Array;
  try {
    bytes = await getAssetStorage().get(asset.objectKey);
  } catch {
    return apiError(404, "not_found", "Asset not found");
  }

  const body = new Uint8Array(bytes.byteLength);
  body.set(bytes);

  return new Response(body.buffer, {
    status: 200,
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
      "Content-Disposition": "inline",
      "Cross-Origin-Resource-Policy": "same-site",
    },
  });
}
