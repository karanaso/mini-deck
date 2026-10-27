import { jsonResponse } from "@/server/api";
import { checkDatabaseHealth } from "@/server/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const healthy = await checkDatabaseHealth();
  return jsonResponse(
    { status: healthy ? "ok" : "unavailable" },
    { status: healthy ? 200 : 503 },
  );
}
