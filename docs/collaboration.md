# Collaboration service

`apps/collab` runs a Hocuspocus v4 WebSocket server. It is a long-lived Node process and must not be deployed to a serverless platform.

## Authentication

The client sends the capability token in the Hocuspocus authentication message. `onAuthenticate` resolves the deck and role against `decks`:

- edit token → context `{ role: "editor" }`
- view token → context `{ role: "viewer" }` and `connectionConfig.readOnly = true`
- invalid token or unknown deck → connection rejected

`readOnly` is enforced by Hocuspocus's message receiver, not just the UI. A modified viewer can connect and receive sync/awareness messages, but every document update is refused. See `apps/collab/test/collab.integration.test.ts`.

## Persistence

- `onLoadDocument` reads the binary Yjs state from `deck_documents`; if no row exists it builds the shared blank deck as a safety net.
- `onStoreDocument` encodes the current document with `Y.encodeStateAsUpdate`, upserts `deck_documents`, and mirrors `meta.title` into `decks.title` in one transaction.
- Default debounce is 2 seconds, maximum 10 seconds. Tests use `COLLAB_DEBOUNCE_MS=100`.
- `server.destroy()` flushes pending stores. A crash can lose only the last few seconds.

The stored snapshot plus asset objects is the complete deck; no event log is required.

## Presence

Awareness carries a participant identity, cursor, and selection. `beforeHandleAwareness` validates each state against the shared zod schema and drops malformed entries. Awareness is not persisted. Disconnecting removes the participant and their cursor through Hocuspocus's connection cleanup.

## Reconnect

The provider reconnects with backoff. Unsynced local updates remain in the in-memory Y.Doc and are sent after reconnection. The UI shows `Connecting`, `Live`, or `Offline`; browser `online`/`offline` events update the badge immediately. Closing a tab while offline is not covered by the durability guarantee.

## Limits and operations

| Setting | Default |
| --- | --- |
| `COLLAB_PORT` | 1234 |
| `COLLAB_DEBOUNCE_MS` | 2000 |
| `COLLAB_MAX_DEBOUNCE_MS` | 10000 |
| `COLLAB_MAX_PAYLOAD_BYTES` | 5 MiB |
| `COLLAB_MAX_DOCUMENTS_PER_CONNECTION` | 10 |
| max unauthenticated queue | Hocuspocus default 5 MiB |

Logs contain deck IDs, roles, socket IDs, and outcomes. Tokens are redacted before logging and never appear in a log line.

## Scaling

One collaboration instance is assumed in v1. Multiple instances require the Hocuspocus Redis extension and sticky routing so clients for the same document land on the same process. This is deliberately out of scope.

## Local commands

```bash
pnpm db:start
pnpm db:migrate
pnpm --filter @mini-deck/collab dev
curl http://localhost:1234/health
```

The health endpoint returns `200 { "status": "ok" }` when the database is reachable. Send `SIGTERM` to exercise graceful shutdown and pending-store flushing.
