import { NextResponse, type NextRequest } from "next/server";

import {
  isLocale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
} from "@/lib/i18n/config";

function isSecureRequest(request: NextRequest): boolean {
  if (request.nextUrl.protocol === "https:") return true;
  const forwardedProto = request.headers.get("x-forwarded-proto");
  return forwardedProto?.split(",")[0]?.trim().toLowerCase() === "https";
}

function applyResponseHeaders(response: NextResponse, path: string): NextResponse {
  const collabUrl = process.env.NEXT_PUBLIC_COLLAB_WS_URL ?? "ws://localhost:1234";
  const connectSrc = collabUrl.startsWith("/")
    ? "connect-src 'self' ws: wss:"
    : `connect-src 'self' ${collabUrl} ws: wss:`;

  const scriptSources =
    process.env.NODE_ENV === "development"
      ? "'self' 'unsafe-inline' 'unsafe-eval' blob:"
      : "'self' 'unsafe-inline' blob:";
  const csp = [
    "default-src 'self'",
    connectSrc,
    `script-src ${scriptSources}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  response.headers.set("Vary", "Origin");

  if ((path.startsWith("/d/") || path.startsWith("/api/")) && !path.startsWith("/api/assets/")) {
    response.headers.set("Cache-Control", "no-store");
  }

  return response;
}

export function proxy(request: NextRequest): NextResponse {
  const path = request.nextUrl.pathname;
  const lang = request.nextUrl.searchParams.get("lang");

  if (path.startsWith("/d/") && isLocale(lang)) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("lang");

    const response = NextResponse.redirect(url, 307);
    response.cookies.set(LOCALE_COOKIE, lang, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
      secure: isSecureRequest(request),
      httpOnly: false,
    });
    return applyResponseHeaders(response, path);
  }

  return applyResponseHeaders(NextResponse.next(), path);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
