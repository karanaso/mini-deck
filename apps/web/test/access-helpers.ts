import { expect } from "vitest";

import { deriveViewToken } from "@mini-deck/deck";

import { POST as createDeckRoute } from "@/app/api/decks/route";
import { POST as unlockDeckRoute } from "@/app/api/decks/[deckId]/unlock/route";

export interface TestDeck {
  deckId: string;
  editToken: string;
  viewToken: string;
  joinCode: string;
  editPin: string;
  viewPin: string;
  title: string;
}

export interface OpenTestDeck {
  deckId: string;
  editToken: string;
  viewToken: string;
  joinCode: string;
  title: string;
}

function createDeckRequest(ip: string, body?: unknown): Request {
  return new Request("http://localhost/api/decks", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

export function params<T extends Record<string, string>>(
  value: T,
): { params: Promise<T> } {
  return { params: Promise.resolve(value) };
}

export async function createProtectedDeck(ip = "127.0.0.1"): Promise<TestDeck> {
  const response = await createDeckRoute(createDeckRequest(ip));
  expect(response.status).toBe(201);
  const data = (await response.json()) as {
    deckId: string;
    editToken: string;
    title: string;
    joinCode: string;
    editPin: string;
    viewPin: string;
  };
  return {
    ...data,
    viewToken: await deriveViewToken(data.editToken, data.deckId),
  };
}

export async function createOpenDeck(ip = "127.0.0.1"): Promise<OpenTestDeck> {
  const response = await createDeckRoute(
    createDeckRequest(ip, { accessMode: "open" }),
  );
  expect(response.status).toBe(201);
  const data = (await response.json()) as {
    deckId: string;
    editToken: string;
    title: string;
    accessMode: "open";
    joinCode: string;
    editPin: null;
    viewPin: null;
  };
  expect(data.accessMode).toBe("open");
  expect(data.editPin).toBeNull();
  expect(data.viewPin).toBeNull();
  return {
    deckId: data.deckId,
    editToken: data.editToken,
    viewToken: await deriveViewToken(data.editToken, data.deckId),
    joinCode: data.joinCode,
    title: data.title,
  };
}

export async function unlockDeckRaw(
  deckId: string,
  token: string,
  pin: string,
  ip = "127.0.0.1",
): Promise<Response> {
  return unlockDeckRoute(
    new Request(`http://localhost/api/decks/${deckId}/unlock`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-forwarded-for": ip,
      },
      body: JSON.stringify({ pin }),
    }),
    params({ deckId }),
  );
}

export async function unlockDeck(
  deckId: string,
  token: string,
  pin: string,
  ip = "127.0.0.1",
): Promise<{ unlockToken: string; role: "editor" | "viewer"; expiresAt: number }> {
  const response = await unlockDeckRaw(deckId, token, pin, ip);
  expect(response.status).toBe(200);
  return (await response.json()) as {
    unlockToken: string;
    role: "editor" | "viewer";
    expiresAt: number;
  };
}
