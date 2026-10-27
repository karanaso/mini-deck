import { NextResponse } from "next/server";

export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
} as const;

export function jsonResponse(
  data: unknown,
  init: { status?: number; headers?: HeadersInit } = {},
): NextResponse {
  return NextResponse.json(data, {
    status: init.status ?? 200,
    headers: {
      ...securityHeaders(),
      ...NO_STORE_HEADERS,
      ...(init.headers ?? {}),
    },
  });
}

export interface ApiErrorOptions {
  headers?: HeadersInit;
  details?: Record<string, string | number>;
}

export function apiError(
  status: number,
  code: string,
  message: string,
  options: ApiErrorOptions = {},
): NextResponse {
  const error = {
    code,
    message,
    ...(options.details ? { details: options.details } : {}),
  };
  return jsonResponse({ error }, { status, headers: options.headers });
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

export function securityHeaders(): HeadersInit {
  return {
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
}
