import { NextRequest, type NextResponse } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "../src/lib/i18n/config";
import { proxy } from "../src/proxy";

const originalCollabUrl = process.env.NEXT_PUBLIC_COLLAB_WS_URL;

afterEach(() => {
  if (originalCollabUrl === undefined) {
    delete process.env.NEXT_PUBLIC_COLLAB_WS_URL;
  } else {
    process.env.NEXT_PUBLIC_COLLAB_WS_URL = originalCollabUrl;
  }
});

function contentSecurityPolicy(url: string): string {
  return proxy(new NextRequest(url)).headers.get("content-security-policy") ?? "";
}

describe("proxy content security policy", () => {
  it("omits a relative collab path from connect-src", () => {
    process.env.NEXT_PUBLIC_COLLAB_WS_URL = "/collab";
    const csp = contentSecurityPolicy("http://localhost:8080/");
    expect(csp).toContain("connect-src 'self' ws: wss:");
    expect(csp).not.toContain("/collab");
  });

  it("keeps an absolute collab URL in connect-src", () => {
    process.env.NEXT_PUBLIC_COLLAB_WS_URL = "wss://collab.example.com";
    const csp = contentSecurityPolicy("https://decks.example.com/");
    expect(csp).toContain(
      "connect-src 'self' wss://collab.example.com ws: wss:",
    );
  });
});

function localeCookie(response: NextResponse) {
  return response.cookies.get(LOCALE_COOKIE);
}

describe("proxy deck language handoff", () => {
  it("redirects a Greek link, removes only lang, and sets the locale cookie", () => {
    const request = new NextRequest(
      "https://decks.example.com/d/deck-1?tab=notes&lang=el&zoom=fit",
      { headers: { cookie: `${LOCALE_COOKIE}=en` } },
    );

    const response = proxy(request);
    const location = new URL(response.headers.get("location") ?? "");

    expect(response.status).toBe(307);
    expect(location.origin).toBe("https://decks.example.com");
    expect(location.pathname).toBe("/d/deck-1");
    expect(location.searchParams.has("lang")).toBe(false);
    expect(location.searchParams.get("tab")).toBe("notes");
    expect(location.searchParams.get("zoom")).toBe("fit");
    expect(localeCookie(response)).toMatchObject({
      name: LOCALE_COOKIE,
      value: "el",
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
      httpOnly: false,
      secure: true,
    });
  });

  it("lets an English link overwrite a Greek cookie", () => {
    const request = new NextRequest(
      "https://decks.example.com/d/deck-1?lang=en",
      { headers: { cookie: `${LOCALE_COOKIE}=el` } },
    );

    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(localeCookie(response)?.value).toBe("en");
    expect(response.headers.get("set-cookie")).not.toContain("HttpOnly");
  });

  it("marks the cookie Secure only for HTTPS or forwarded HTTPS", () => {
    const plain = proxy(
      new NextRequest("http://decks.example.com/d/deck-1?lang=en"),
    );
    const forwarded = proxy(
      new NextRequest("http://decks.example.com/d/deck-1?lang=en", {
        headers: { "x-forwarded-proto": "https, http" },
      }),
    );

    expect(localeCookie(plain)?.secure).toBe(false);
    expect(plain.headers.get("set-cookie")).not.toContain("Secure");
    expect(localeCookie(forwarded)?.secure).toBe(true);
    expect(forwarded.headers.get("set-cookie")).toContain("Secure");
  });

  it("keeps security headers and no-store on the redirect response", () => {
    const response = proxy(
      new NextRequest("https://decks.example.com/d/deck-1?lang=el"),
    );

    expect(response.headers.get("content-security-policy")).toContain(
      "frame-ancestors 'none'",
    );
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("permissions-policy")).toContain("camera=()");
    expect(response.headers.get("vary")).toBe("Origin");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it.each([
    ["unsupported", "https://decks.example.com/d/deck-1?lang=fr"],
    ["empty", "https://decks.example.com/d/deck-1?lang="],
    ["missing", "https://decks.example.com/d/deck-1"],
    ["non-deck path", "https://decks.example.com/?lang=el"],
    ["API path", "https://decks.example.com/api/decks?lang=el"],
  ])("leaves %s links on the existing path without a cookie", (_label, url) => {
    const response = proxy(new NextRequest(url));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(localeCookie(response)).toBeUndefined();
  });
});
