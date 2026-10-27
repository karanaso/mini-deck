import "dotenv/config";
import { Server } from "@hocuspocus/server";
import type { onRequestPayload } from "@hocuspocus/server";
import { sql } from "drizzle-orm";

import { getDatabase } from "@mini-deck/db";
import { getCollabEnv } from "./env.js";
import { redactToken, resolveDeckAccess, type DeckAccess } from "./auth.js";
import { sanitizeAwarenessStates } from "./awareness.js";
import { loadDocumentState, storeDocumentState } from "./persistence.js";

export interface CollabContext {
  deckId: string;
  role: "editor" | "viewer";
}

const openDocuments = new Map<string, Set<string>>();

async function healthHandler({ request, response }: onRequestPayload): Promise<void> {
  if (request.url !== "/health") return;
  const { db } = getDatabase();
  try {
    await db.execute(sql`select 1`);
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ok" }));
  } catch {
    response.writeHead(503, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "unavailable" }));
  }
  // Hocuspocus treats a falsy rejection reason as "handled" and skips its own response.
  return Promise.reject();
}

export function createCollabServer() {
  const env = getCollabEnv();

  return new Server<CollabContext>({
    name: "mini-deck-collab",
    port: env.COLLAB_PORT,
    address: env.COLLAB_HOST,
    quiet: true,
    stopOnSignals: false,
    debounce: env.COLLAB_DEBOUNCE_MS,
    maxDebounce: env.COLLAB_MAX_DEBOUNCE_MS,
    maxPendingDocuments: env.COLLAB_MAX_DOCUMENTS_PER_CONNECTION,
    websocketOptions: { maxPayload: env.COLLAB_MAX_PAYLOAD_BYTES },
    async onAuthenticate({ documentName, token, connectionConfig, socketId, request }) {
      const access: DeckAccess | null = await resolveDeckAccess(documentName, token);
      if (!access) {
        console.warn(
          JSON.stringify({
            event: "collab.auth.rejected",
            deckId: documentName,
            socketId,
            token: redactToken(token),
            origin: request.headers.get("origin") ?? null,
          }),
        );
        throw new Error("Not authorized");
      }

      const documents = openDocuments.get(socketId) ?? new Set<string>();
      if (!documents.has(documentName)) {
        if (documents.size >= env.COLLAB_MAX_DOCUMENTS_PER_CONNECTION) {
          throw new Error("Too many open documents on one connection");
        }
        documents.add(documentName);
        openDocuments.set(socketId, documents);
      }

      if (access.role === "viewer") {
        connectionConfig.readOnly = true;
      }

      console.info(
        JSON.stringify({
          event: "collab.auth.accepted",
          deckId: documentName,
          role: access.role,
          socketId,
        }),
      );

      return { deckId: documentName, role: access.role };
    },
    async onLoadDocument({ documentName }) {
      return loadDocumentState(documentName);
    },
    async onStoreDocument({ document, documentName }) {
      await storeDocumentState(documentName, document);
    },
    async beforeHandleAwareness({ states }) {
      sanitizeAwarenessStates(states);
    },
    async onDisconnect({ documentName, socketId, context }) {
      openDocuments.get(socketId)?.delete(documentName);
      if (openDocuments.get(socketId)?.size === 0) openDocuments.delete(socketId);
      console.info(
        JSON.stringify({
          event: "collab.disconnect",
          deckId: documentName,
          role: context?.role ?? null,
          socketId,
          documents: openDocuments.get(socketId)?.size ?? 0,
        }),
      );
    },
    async onRequest(payload) {
      await healthHandler(payload);
    },
  });
}

export async function startCollabServer(): Promise<Server<CollabContext>> {
  const env = getCollabEnv();
  const server = createCollabServer();
  await server.listen();
  console.info(
    JSON.stringify({
      event: "collab.listening",
      port: env.COLLAB_PORT,
      address: env.COLLAB_HOST,
    }),
  );
  return server;
}
