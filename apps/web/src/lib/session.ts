import { deriveViewToken, type Role } from "@mini-deck/deck";

import { ApiError, parseApiError } from "@/lib/api-error";
import type { DeckAccessValues } from "@/lib/deck-access-values";
import type { Locale } from "@/lib/i18n/config";

export interface DeckSession {
  role: Role;
  title: string;
  protected: boolean;
}

export type DeckSessionResult =
  | { status: "ready"; session: DeckSession }
  | { status: "pin_required"; role: Role }
  | { status: "not_found" };

export interface UnlockResult extends DeckSession {
  deckId: string;
  unlockToken: string;
  expiresAt: number;
}

export function readFragmentToken(hash: string): string | null {
  const token = hash.startsWith("#") ? hash.slice(1) : hash;
  return token.trim() || null;
}

export async function fetchDeckSession(
  deckId: string,
  token: string,
  fetcher: typeof fetch = fetch,
): Promise<DeckSessionResult> {
  let response: Response;
  try {
    response = await fetcher(`/api/decks/${encodeURIComponent(deckId)}/session`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch (error) {
    throw new ApiError(
      "network",
      0,
      "The deck session request could not be completed",
      {},
      error,
    );
  }

  if (response.status === 404 || response.status === 401 || response.status === 403) {
    return { status: "not_found" };
  }
  if (!response.ok) {
    throw await parseApiError(response);
  }

  const data = (await response.json()) as Partial<DeckSession> & {
    requiresPin?: unknown;
  };
  if (
    data.requiresPin === true &&
    (data.role === "editor" || data.role === "viewer")
  ) {
    return { status: "pin_required", role: data.role };
  }
  if (
    (data.role !== "editor" && data.role !== "viewer") ||
    typeof data.title !== "string"
  ) {
    throw new ApiError(
      "invalid_response",
      response.status,
      "The deck session response was invalid",
    );
  }
  return {
    status: "ready",
    session: {
      role: data.role,
      title: data.title,
      protected: data.protected === true,
    },
  };
}

async function postJson<T>(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  fetcher: typeof fetch,
): Promise<T> {
  let response: Response;
  try {
    response = await fetcher(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new ApiError("network", 0, "The request could not be completed", {}, error);
  }
  if (!response.ok) throw await parseApiError(response);
  return (await response.json()) as T;
}

export async function unlockDeckWithPin(
  deckId: string,
  linkToken: string,
  pin: string,
  fetcher: typeof fetch = fetch,
): Promise<UnlockResult> {
  return postJson<UnlockResult>(
    `/api/decks/${encodeURIComponent(deckId)}/unlock`,
    { pin },
    { Authorization: `Bearer ${linkToken}` },
    fetcher,
  );
}

export async function lookupJoinCode(
  code: string,
  fetcher: typeof fetch = fetch,
): Promise<{ deckId: string; title: string }> {
  return postJson<{ deckId: string; title: string }>(
    "/api/join/lookup",
    { code },
    {},
    fetcher,
  );
}

export async function unlockJoinCode(
  code: string,
  role: Role,
  pin: string,
  fetcher: typeof fetch = fetch,
): Promise<UnlockResult> {
  return postJson<UnlockResult>(
    "/api/join/unlock",
    { code, role, pin },
    {},
    fetcher,
  );
}

export async function resetDeckAccess(
  deckId: string,
  sessionToken: string,
  fetcher: typeof fetch = fetch,
): Promise<UnlockResult & DeckAccessValues> {
  return postJson<UnlockResult & DeckAccessValues>(
    `/api/decks/${encodeURIComponent(deckId)}/access/reset`,
    {},
    { Authorization: `Bearer ${sessionToken}` },
    fetcher,
  );
}

export async function buildDeckLinks(
  deckId: string,
  editToken: string,
  locale: Locale,
  origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
): Promise<{ editUrl: string; viewUrl: string }> {
  const viewToken = await deriveViewToken(editToken, deckId);
  const buildLink = (token: string) => {
    const url = new URL(`/d/${encodeURIComponent(deckId)}`, origin);
    url.searchParams.set("lang", locale);
    url.hash = token;
    return url.toString();
  };

  return {
    editUrl: buildLink(editToken),
    viewUrl: buildLink(viewToken),
  };
}
