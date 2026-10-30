import { NextResponse } from "next/server";

import { securityHeaders } from "@/server/api";
import { getEnabledStockProviderIds } from "@/server/stock-images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return NextResponse.json(
    { providers: getEnabledStockProviderIds() },
    {
      headers: {
        ...securityHeaders(),
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}
