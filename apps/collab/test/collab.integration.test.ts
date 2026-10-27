import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
import { eq } from "drizzle-orm";

import { deckDocuments, decks, getDatabase } from "@mini-deck/db";
import {
  createDeckId,
  createInitialDeckDoc,
  createSlide,
  createTextElement,
  deriveViewToken,
  generateEditToken,
  getDeckData,
  getDeckTitle,
  getOrderedSlideIds,
  hashToken,
} from "@mini-deck/deck";

import { createCollabServer, startCollabServer } from "../src/server.js";
import { sanitizeAwarenessStates } from "../src/awareness.js";
import { redactToken } from "../src/auth.js";
import { resetIntegrationState } from "../../../test/integration-helpers.js";

interface SeededDeck {
  deckId: string;
  editToken: string;
  viewToken: string;
}

async function seedDeck(): Promise<SeededDeck> {
  const deckId = createDeckId();
  const editToken = await generateEditToken();
  const viewToken = await deriveViewToken(editToken, deckId);
  const document = createInitialDeckDoc();
  const state = Y.encodeStateAsUpdate(document);
  const now = new Date();
  const { db } = getDatabase();
  await db.insert(decks).values({
    id: deckId,
    title: "Untitled deck",
    editTokenHash: await hashToken(editToken),
    viewTokenHash: await hashToken(viewToken),
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(deckDocuments).values({ deckId, state, updatedAt: now });
  document.destroy();
  return { deckId, editToken, viewToken };
}

function waitFor<T>(probe: () => T | null | undefined | false, timeout = 5000): Promise<T> {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      try {
        const value = probe();
        if (value) return resolve(value as T);
      } catch {
        // The provider may not have synced yet.
      }
      if (Date.now() - started > timeout) {
        reject(new Error("Timed out waiting for condition"));
        return;
      }
      setTimeout(tick, 25);
    };
    tick();
  });
}

async function connect(
  port: number,
  deckId: string,
  token: string,
  document = new Y.Doc(),
  options: { awaitSync?: boolean } = {},
): Promise<HocuspocusProvider> {
  const provider = new HocuspocusProvider({
    url: `ws://127.0.0.1:${port}`,
    name: deckId,
    token,
    document,
    WebSocketPolyfill: WebSocket,
  });
  if (options.awaitSync !== false) {
    await waitFor(() => provider.synced);
  }
  return provider;
}

let server: Awaited<ReturnType<typeof startCollabServer>>;
let port = 0;

beforeAll(async () => {
  await resetIntegrationState();
  server = await startCollabServer();
  port = server.address.port;
});

afterAll(async () => {
  if (server) await server.destroy();
  await resetIntegrationState();
});

describe("collaboration service", () => {
  it("reports healthy", async () => {
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("refuses oversized WebSocket payloads", async () => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    const closed = new Promise<{ code: number }>((resolve) => {
      socket.addEventListener("close", (event) => resolve({ code: event.code }));
    });
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener("open", () => resolve());
      socket.addEventListener("error", () => reject(new Error("socket error")));
      setTimeout(() => reject(new Error("open timeout")), 3000);
    });
    socket.send(new Uint8Array(6 * 1024 * 1024));
    const result = await Promise.race([
      closed,
      new Promise<{ code: number }>((resolve) =>
        setTimeout(() => resolve({ code: 0 }), 3000),
      ),
    ]);
    expect(result.code).toBe(1009);
    socket.close();
  });

  it("authenticates editors and synchronizes document edits", async () => {
    const seeded = await seedDeck();
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    const providerA = await connect(port, seeded.deckId, seeded.editToken, docA);
    const providerB = await connect(port, seeded.deckId, seeded.editToken, docB);
    const slideId = getOrderedSlideIds(docA)[0];

    docA.getMap("meta").set("title", "Shared title");
    await waitFor(() => getDeckTitle(docB) === "Shared title");

    const textId = createTextElement(docA, slideId, { text: "Live from A" });
    await waitFor(() =>
      getDeckData(docB).slides[0]?.elements.some(
        (element) => element.id === textId && element.type === "text",
      ),
    );
    expect(getDeckData(docB).slides[0].elements[0]).toMatchObject({ text: "Live from A" });

    providerA.destroy();
    providerB.destroy();
    docA.destroy();
    docB.destroy();
  });

  it("rejects invalid tokens", async () => {
    const seeded = await seedDeck();
    const doc = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: `ws://127.0.0.1:${port}`,
      name: seeded.deckId,
      token: "not-a-valid-token",
      document: doc,
      WebSocketPolyfill: WebSocket,
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(provider.synced).toBe(false);
    provider.destroy();
    doc.destroy();
  });

  it("enforces read-only viewers while streaming updates to them", async () => {
    const seeded = await seedDeck();
    const editorDoc = new Y.Doc();
    const viewerDoc = new Y.Doc();
    const editor = await connect(port, seeded.deckId, seeded.editToken, editorDoc);
    const viewer = await connect(port, seeded.deckId, seeded.viewToken, viewerDoc);

    const firstSlide = getOrderedSlideIds(editorDoc)[0];
    createSlide(editorDoc, firstSlide);
    await waitFor(() => getOrderedSlideIds(viewerDoc).length === 2);

    viewerDoc.getMap("meta").set("title", "Viewer changed this");
    await new Promise((resolve) => setTimeout(resolve, 300));

    const verifierDoc = new Y.Doc();
    const verifier = await connect(port, seeded.deckId, seeded.editToken, verifierDoc);
    expect(getDeckTitle(verifierDoc)).toBe("Untitled deck");
    expect(getOrderedSlideIds(verifierDoc)).toHaveLength(2);

    editor.destroy();
    viewer.destroy();
    verifier.destroy();
    editorDoc.destroy();
    viewerDoc.destroy();
    verifierDoc.destroy();
  });

  it("broadcasts awareness and clears it on disconnect", async () => {
    const seeded = await seedDeck();
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    const providerA = await connect(port, seeded.deckId, seeded.editToken, docA);
    const providerB = await connect(port, seeded.deckId, seeded.editToken, docB);
    const awarenessA = providerA.awareness!;
    const awarenessB = providerB.awareness!;

    awarenessA.setLocalStateField("user", {
      id: "participant-a",
      name: "Amber Fox",
      color: "#2563eb",
    });
    awarenessA.setLocalStateField("cursor", { slideId: "slide-1", x: 100, y: 200 });
    awarenessA.setLocalStateField("selection", { slideId: "slide-1", ids: ["el-1"] });

    await waitFor(() => awarenessB.getStates().has(docA.clientID));
    expect(awarenessB.getStates().get(docA.clientID)).toMatchObject({
      user: { name: "Amber Fox" },
      cursor: { slideId: "slide-1", x: 100, y: 200 },
    });

    providerA.destroy();
    await waitFor(() => !awarenessB.getStates().has(docA.clientID));

    providerB.destroy();
    docA.destroy();
    docB.destroy();
  });

  it("persists document state and survives a server restart", async () => {
    const seeded = await seedDeck();
    const doc = new Y.Doc();
    const provider = await connect(port, seeded.deckId, seeded.editToken, doc);
    const slideId = getOrderedSlideIds(doc)[0];
    const textId = createTextElement(doc, slideId, { text: "Persisted text" });
    doc.getMap("meta").set("title", "Persisted title");
    await new Promise((resolve) => setTimeout(resolve, 500));

    const { db } = getDatabase();
    const stored = await db
      .select()
      .from(deckDocuments)
      .where(eq(deckDocuments.deckId, seeded.deckId));
    const storedDoc = new Y.Doc();
    Y.applyUpdate(storedDoc, stored[0].state);
    expect(getDeckTitle(storedDoc)).toBe("Persisted title");
    expect(
      getDeckData(storedDoc).slides[0].elements.find((element) => element.id === textId),
    ).toMatchObject({ text: "Persisted text" });

    provider.destroy();
    doc.destroy();
    storedDoc.destroy();
    await new Promise((resolve) => setTimeout(resolve, 100));

    await server.destroy();
    server = createCollabServer();
    await server.listen(0);
    port = server.address.port;

    const reloadedDoc = new Y.Doc();
    const reloaded = await connect(port, seeded.deckId, seeded.editToken, reloadedDoc);
    expect(getDeckTitle(reloadedDoc)).toBe("Persisted title");
    expect(
      getDeckData(reloadedDoc).slides[0].elements.some((element) => element.id === textId),
    ).toBe(true);
    reloaded.destroy();
    reloadedDoc.destroy();
  });
});

describe("awareness sanitization and logging", () => {
  it("drops malformed awareness states and keeps valid ones", () => {
    const states = new Map<number, Record<string, any>>([
      [
        1,
        {
          user: { id: "u1", name: "Valid", color: "#2563eb" },
          cursor: null,
          selection: null,
        },
      ],
      [2, { user: { id: "", name: "", color: "" }, cursor: null, selection: null }],
    ]);
    sanitizeAwarenessStates(states);
    expect(states.has(1)).toBe(true);
    expect(states.has(2)).toBe(false);
  });

  it("redacts tokens in logs", () => {
    const token = "abcdefghijklmnopqrstuvwxyz";
    const redacted = redactToken(token);
    expect(redacted).not.toBe(token);
    expect(redacted).not.toContain("defghijklmnop");
  });
});
