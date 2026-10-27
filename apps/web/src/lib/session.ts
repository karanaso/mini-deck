import { deriveViewToken, type Role } from "@mini-deck/deck";

import { ApiError, parseApiError } from "@/lib/api-error";
import type { Locale } from "@/lib/i18n/config";

export interface DeckSession {
  role: Role;
  title: string;
}

export function readFragmentToken(hash: string): string | null {
  const token = hash.startsWith("#") ? hash.slice(1) : hash;
  return token.trim() || null;
}

export async function fetchDeckSession(
  deckId: string,
  token: string,
  fetcher: typeof fetch = fetch,
): Promise<DeckSession | null> {
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
    return null;
  }
  if (!response.ok) {
    throw await parseApiError(response);
  }

  const data = (await response.json()) as Partial<DeckSession>;
  if ((data.role !== "editor" && data.role !== "viewer") || typeof data.title !== "string") {
    throw new ApiError(
      "invalid_response",
      response.status,
      "The deck session response was invalid",
    );
  }
  return { role: data.role, title: data.title };
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
