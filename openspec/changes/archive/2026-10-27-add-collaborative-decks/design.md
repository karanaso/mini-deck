# Design

## Context

This repository is greenfield: it contains only OpenSpec configuration and no application code. The motivation is in `proposal.md`; the behavior contract is in `specs/`. The design is shaped by four constraints:

- **No accounts.** Authorization comes from unguessable links, so the app needs capability-token validation rather than sessions or user records.
- **Live collaboration.** Deck content must be shared through a long-lived, conflict-free channel, not polled HTTP.
- **Two audiences for one document.** The same content must render identically in the editor, presentation mode, and exported files.
- **Small decks, low ceremony.** The system should stay understandable and self-hostable; horizontal scale and enterprise controls are deliberately deferred.

There is no existing code or data to migrate. The target is a desktop web app served from containers.

## Goals / Non-Goals

**Goals:**

- Run a web app and a collaboration service from one pnpm workspace with a shared deck schema.
- Make the Yjs document the single source of truth for deck content, with PostgreSQL as durable storage.
- Render slides through one shared renderer so editor, presentation, PNG, and PDF agree.
- Enforce edit/view roles on the server, even if a client is modified.
- Keep operational setup to PostgreSQL, S3-compatible storage, and two Node processes.

**Non-Goals:**

- Horizontal scaling of collaboration across multiple server instances (Redis fan-out).
- Owner accounts, link revocation, per-user permissions, comments, version history, or audit logs.
- `.pptx` import/export, animations, transitions, audio, video, or rich-text formatting.
- Offline-first persistence after the tab is closed; reconnect recovery only covers the open session.
- Touch-first editing or a native mobile app. Small screens may view a deck, but editing targets desktop.
- Vector-text PDF output. Exports are rasterized for fidelity.

## Decisions

### D1. Workspace and runtime split

Use pnpm workspaces:

```text
apps/web/          Next.js App Router UI, HTTP APIs, asset delivery
apps/collab/       Hocuspocus WebSocket server and Yjs persistence
packages/deck/     Deck document schema, element types, tokens, clipboard codec
packages/db/       Drizzle schema, migrations, database client
infra/             docker-compose for PostgreSQL and MinIO
```

- **Next.js (App Router, React 19, TypeScript)** handles pages, server-side API routes, and image delivery. Deck pages are client-rendered shells because the capability token lives in the URL fragment and is never sent during the initial HTML request.
- **Hocuspocus v4 + Yjs** runs as a separate Node 22+ service. WebSockets need a long-lived process, so the collaboration server cannot live in a serverless function. Keeping it separate also lets document persistence and presence be tuned without affecting web deploys.
- **PostgreSQL** stores deck metadata, Yjs snapshots, and asset records. **S3-compatible object storage** (MinIO locally) stores uploaded images.
- Shared packages are consumed as TypeScript source during development; the web app uses `transpilePackages`, and the collab service builds with `tsc` for production.

**Alternatives considered**

- *One Next.js custom server hosting both HTTP and WebSockets*: fewer processes, but couples deploys, complicates scaling, and breaks on serverless hosting. Rejected.
- *Hosted realtime service (Liveblocks or similar)*: faster to start, but introduces vendor lock-in, recurring cost, and account-based assumptions that do not fit link-only access.
- *Turborepo/Nx*: extra tooling for a two-app repo. Plain pnpm workspaces are sufficient for v1.

### D2. Deck document model

One Yjs document represents one deck. Its root structure is:

```text
DeckDoc
├── meta: Y.Map           { title, schemaVersion }
├── slides: Y.Map         slideId -> SlideMap
│   └── SlideMap
│       ├── background: string
│       ├── elements: Y.Map       elementId -> ElementMap
│       └── elementOrder: Y.Array<elementId>
└── slideOrder: Y.Array<slideId>
```

- **Fixed logical canvas**: every slide is 1920×1080. All coordinates, sizes, stroke widths, and font sizes use this space; the editor only changes the display scale.
- **Nested `Y.Map`s** preserve concurrent edits to different properties of the same element. Moving an element while another participant recolors it merges cleanly.
- **`elementOrder` and `slideOrder`** are explicit arrays rather than relying on map insertion order, which is not a safe cross-client z-order contract. Bringing an element to front rewrites its position in `elementOrder`.
- **Text content is a nested `Y.Text`**, not a string, so concurrent typing merges character by character as required by the collaboration spec. Style fields remain primitive properties.
- **`schemaVersion`** in `meta` allows future document migrations. A shared `createInitialDeckDoc()` builds one blank slide and is used both at deck creation and as a fallback when loading an empty document.
- **IDs** are random 12-character identifiers for slides and elements. They are local to a deck; copied elements receive new IDs on paste.
- **Missing assets** render as a placeholder with the element's frame rather than failing the whole deck.

Element fields:

| Type | Common fields | Type-specific fields |
| --- | --- | --- |
| `text` | `id`, `x`, `y`, `width`, `height`, `rotation`, `opacity` | `content` (`Y.Text`), `fontSize`, `fill`, `align` |
| `rect` | same | `fill`, `stroke`, `strokeWidth`, `cornerRadius` |
| `ellipse` | same | `fill`, `stroke`, `strokeWidth` |
| `arrow` | same | `stroke`, `strokeWidth`, `flipX`, `flipY` |
| `image` | same | `assetId` |

Arrows use the element bounding box plus `flipX`/`flipY` to encode direction. They can be moved, resized, and rotated like other elements; endpoint editing is out of scope. One bundled font (Inter) is used for all text so editor and export metrics match; there is no font picker in v1.

### D3. Canvas rendering with Konva

Use **Konva + react-konva** rather than an off-the-shelf whiteboard engine.

- A `Stage` contains three layers: slide content (clipped to 1920×1080), selection/transformer, and collaboration overlays (remote cursors and selections).
- The stage is scaled to fit the available viewport and supports zoom. Panning is limited to what is useful for a fixed slide; there is no infinite canvas.
- Konva's `Transformer` provides move, resize, rotate, and multi-select handles. Shift locks aspect ratio.
- **Text editing** uses an HTML `<textarea>` overlay positioned in stage coordinates over the text element. Edits are converted to insert/delete deltas on the nested `Y.Text`; remote deltas update the overlay. The overlay is styled to match the canvas text so the transition is not jarring.
- **Transforms** update Yjs properties on animation frames with integer coordinates, inside one transaction per gesture. This keeps network traffic bounded and lets undo group a drag into one action.
- **Thumbnails** are produced by a shared offscreen renderer, debounced and cached in memory. They are not persisted; they are regenerated when a deck loads.
- **Remote selections** are drawn as colored outlines plus a name tag. **Remote cursors** are drawn from awareness state, only when the other participant is on the same slide.

**Alternatives considered**

- *tldraw*: mature canvas and collaboration, but the free license adds a watermark, its sync backend is oriented around Cloudflare Durable Objects, and its infinite-canvas/page model would need significant adaptation for fixed slides. The licensing and backend constraints are material for a product. Rejected.
- *Excalidraw*: optimized for infinite whiteboards and embedding, not slide decks; customizing its UI and data model is awkward. Rejected.
- *Fabric.js*: capable, but less natural React integration and event handling than react-konva. Rejected.
- *DOM/SVG elements*: easier for text editing and accessibility, but export fidelity, clipping, and many-element performance are harder to guarantee.

### D4. Realtime collaboration

**Transport.** `@hocuspocus/provider` connects the client's `Y.Doc` to a Hocuspocus document named by the deck ID. Yjs is the authority for merges; the client applies changes locally before they reach the server.

**Authentication.** The provider sends the capability token in its authentication message, not in the WebSocket URL. `onAuthenticate` resolves the token against the `decks` table and returns a context containing the role. For a view token, it sets `connection.readOnly = true`, which makes Hocuspocus reject document updates from that connection while still allowing sync and awareness. This is the server-side enforcement required by the spec; hiding controls in the UI is only a second layer.

**Presence and awareness.** Each open tab gets a random participant identity stored in `sessionStorage` and a generated name such as "Amber Fox" plus a palette color. Generated names and colors are checked against current awareness; collisions get a short numeric suffix or the next unused palette color so connected participants remain distinguishable. Awareness state carries:

```ts
{
  user: { id, name, color },
  cursor: { slideId, x, y } | null,
  selection: { slideId, ids: string[] } | null
}
```

Awareness is ephemeral and never persisted. Cursor updates are throttled, cleared when the pointer leaves the canvas or the participant changes slides, and removed automatically when Hocuspocus detects a disconnect. Viewers can still broadcast cursor and selection awareness, so they appear in presence and are visible to editors.

**Persistence.** Use Hocuspocus's database extension (or the equivalent `onLoadDocument`/`onStoreDocument` hooks) with a `deck_documents` row per deck:

- Load: read the binary Yjs state and apply it to the new document.
- Store: encode the full document state with `Y.encodeStateAsUpdate`, upsert it, and mirror `meta.title` into `decks.title` in the same transaction.
- Use the default 2-second debounce and 10-second maximum. The server flushes pending stores on shutdown. A crash can lose at most the last few seconds of edits.
- If no document exists, initialize it with the shared blank-deck factory. Deck creation normally writes the initial state immediately, so this is only a safety net.

**Reconnect.** The provider reconnects with backoff. Unsynced local updates remain in the in-memory document and are sent after reconnection, so the open tab recovers without reloading. Closing the tab while offline is not guaranteed to preserve those edits, which is outside the spec.

**Scale.** One collaboration instance is assumed in v1. Running multiple instances would require the Redis extension and sticky routing; that is a documented future step, not part of this change.

**Alternatives considered**

- *Liveblocks*: excellent presence and storage primitives, but hosted and account-oriented; capability-link access without accounts is not its natural model.
- *Supabase Realtime broadcast*: requires assembling sync, persistence, and authorization around broadcast messages; Yjs still needs a provider and a durable store. More custom infrastructure than Hocuspocus.
- *Polling or last-write-wins REST saves*: fails the live-editing and concurrent-merge requirements.

### D5. Sharing and capability security

**Tokens.**

- `deckId`: 21-character nanoid (126 bits of entropy).
- `editToken`: 32 random bytes, base64url-encoded.
- `viewToken`: `base64url(HMAC-SHA256(key = editToken bytes, message = "view:" + deckId))`. This is one-way: an editor can derive the view link, but a view token cannot reveal the edit token.
- Only SHA-256 hashes of both tokens are stored. Role resolution hashes the presented token and compares against both hashes with a timing-safe comparison.

**URLs and bootstrap.** Links use `/d/{deckId}#{token}`. The token is in the fragment, so it is not sent in the initial HTTP request, server access logs, or the `Referer` header. The page shell loads, client code reads the fragment, calls `POST /api/decks/{deckId}/session` with `Authorization: Bearer {token}`, and receives `{ role, title }`. The same token is handed to the collaboration provider. Edit and view links share one route; the role comes from the token, not from the URL path.

The share dialog derives the view token from the edit token locally and presents both links. It is available only to editors. View-only sessions have no edit token in memory, so the share dialog cannot be opened and the edit link cannot be reconstructed.

**Deck creation.** `POST /api/decks` generates the tokens, stores their hashes, writes the initial Yjs document, and returns `{ deckId, editToken }`. The browser immediately navigates to the edit URL and records the deck in local recents.

**Assets.** Uploaded images are served from `/api/assets/{assetId}`. Asset IDs are random 128-bit values and act as secondary capability URLs so `<img>` tags need no auth header. Responses are immutable and long-cached. Uploads require an edit token. SVG and other active formats are rejected; images are decoded and re-encoded with `sharp` to strip metadata and enforce a 10 MB limit. This keeps the primary deck capability out of image URLs while accepting that a leaked image URL exposes that image.

**Hardening.**

- `Referrer-Policy: no-referrer`, `Cache-Control: no-store` for deck shells, `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`.
- Strict CSP with `connect-src` limited to the app and collaboration origins and no third-party scripts on deck pages. This matters because a fragment token is readable by any script on the page.
- Rate-limit deck creation and failed token attempts per IP. Use an in-memory token bucket for the single web instance; move to a shared store if the web tier scales.
- Never log tokens. Log deck IDs, roles, and outcomes only.
- Validate all clipboard, REST, and WebSocket payloads with shared zod schemas and hard limits.

**Limitation.** A capability link has no owner, expiry, or revocation in v1. Anyone who obtains an edit link can edit or share it. The UI warns about this. Link rotation and owner keys are future work; adding them would not change the document architecture.

### D6. Data model, storage, and local recents

PostgreSQL tables:

```text
decks
  id                 text primary key
  title              text not null
  edit_token_hash    text not null
  view_token_hash    text not null
  created_at         timestamptz not null
  updated_at         timestamptz not null

deck_documents
  deck_id            text primary key references decks(id) on delete cascade
  state              bytea not null
  updated_at         timestamptz not null

deck_assets
  id                 text primary key
  deck_id            text not null references decks(id) on delete cascade
  object_key         text not null
  mime_type          text not null
  byte_size          integer not null
  width              integer not null
  height             integer not null
  created_at         timestamptz not null
```

Drizzle migrations are applied before the services start. Object keys are `decks/{deckId}/{assetId}`. The bucket is private; the web app streams objects through the asset route and sets the stored MIME type and cache headers. A CDN/proxy can replace this later without changing deck content.

**Autosave** is a property of the collaboration layer: edits reach Yjs immediately and are persisted by the debounced store. REST is used only for creation, session resolution, and uploads; every keystroke does not become an HTTP request.

**Recent decks** are a device feature, not server data. `localStorage` stores `{ deckId, editToken, title, lastOpenedAt }[]`, sorted by last opened. It is updated when an edit link is opened and whenever the title changes during an open session, including a remote participant's rename. Removing an entry only deletes the local record; links keep working. This directly implements the spec's "clearing storage loses only the list" behavior. View-link visits do not add entries because the view token cannot later open an editor.

**Deletion and retention** are not implemented in v1. The schema uses cascading foreign keys so a future deletion job can remove a deck's document and asset rows. Orphaned object-storage files from abandoned uploads need a future cleanup job.

### D7. Clipboard, undo, and keyboard

**Clipboard envelope.** Copying selected elements produces a versioned JSON envelope:

```ts
{ format: "mini-deck/clipboard", version: 1, elements: [...] }
```

It is offered as `application/x-mini-deck+json` when the browser permits, as a `text/html` marker for cross-tab/cross-deck fallback, and as a short human-readable `text/plain` summary. Paste precedence is:

1. Same-tab in-memory clipboard (most reliable).
2. Custom MIME envelope.
3. HTML marker.
4. Image files from the system clipboard.
5. Non-empty plain text.

Unknown or malformed envelopes are ignored rather than treated as elements. Elements are validated with zod, capped at 200 elements and 1 MB, assigned new IDs, offset by a small amount, and inserted into the current slide with their relative positions preserved. This makes cross-deck copy/paste work without any server-side clipboard.

**Undo/redo.** A `Y.UndoManager` tracks only local transaction origins; updates arriving from the provider are excluded. Drags and text edits create grouped transactions, with a short capture timeout so typing is undoable in sensible chunks. Undo never reverts another participant's edits. The history is capped to keep memory bounded.

**Shortcuts.** Copy, cut, paste, duplicate, undo, redo, delete, arrow-key nudge, Shift+arrow large nudge, and presentation navigation. Shortcuts are ignored while a text editor or input has focus.

### D8. Presentation and export

A single `renderSlideToCanvas(slide, { width: 1920, height: 1080 })` function renders content without selection or collaboration layers. It is reused by thumbnails, PNG export, PDF pages, and presentation mode (with a scaled display).

- **PNG** export rasterizes the current slide at 1920×1080 and downloads it with a sanitized title and slide number in the filename.
- **PDF** export renders slides sequentially in `slideOrder`, embeds each as an image on a 960×540 pt (16:9) page using `pdf-lib`, and downloads one file. Sequential rendering bounds memory. If an image fails to load, the export aborts, reports the problem, and leaves no partial download. Progress is shown for multi-slide decks.
- **Presentation mode** is a full-screen overlay with the current slide scaled to fit, a slide counter, and keyboard navigation. It hides toolbars, presence, cursors, and selections. It uses the Fullscreen API when the browser grants it and works as a viewport overlay otherwise.
- **Fonts and images** are loaded and decoded before export. The bundled font avoids metric differences between editor and export.
- **PDF is raster-based** for exact fidelity; text is not selectable. Adding vector PDF is a future enhancement.

**Alternatives considered**

- *Server-side headless browser rendering*: deterministic across clients, but adds a heavy, security-sensitive service and duplicates the renderer. Rejected for v1.
- *DOM-to-image / html2canvas*: less reliable for Konva canvas content and fonts. Rejected.

### D9. Frontend structure and state

Routes:

- `/` — landing page with **New deck** and the device-local recent list.
- `/d/[deckId]` — client shell that reads the fragment token, resolves the session, and renders either the editor or the read-only viewer. The same route supports presentation as an overlay.

Editor composition:

- `TopBar`: deck title, presence, Share, Present, Export, connection state.
- `SlideRail`: thumbnails, add/duplicate/delete/reorder.
- `CanvasStage`: Konva content, transformer, remote cursors/selections.
- `Toolbar` and `StylePanel`: tools, appearance controls, layering.
- `ShareDialog`, `ExportDialog`, `PresentationOverlay`, `ConnectionBadge`.

State ownership:

- **Yjs** owns title, slides, slide order, elements, styles, and text content.
- **Awareness** owns presence, cursors, and selections.
- **Local UI state** (current slide, zoom, open dialogs, tool, hover) lives in a small Zustand store. The current slide is intentionally local per participant; the spec only requires slide *content* and order to be shared.
- React reads Yjs through a thin adapter built on `useSyncExternalStore`, with subscriptions scoped to the slide or element being rendered. This avoids re-rendering the whole editor on every keystroke.
- The role returned by the session endpoint drives the editor/viewer split. The viewer renders the same canvas but never instantiates editing handlers, uploads, or the share dialog.

Error handling: invalid or tampered links show the same generic not-found page; a failed session request is not retried indefinitely. Connection loss shows a non-blocking reconnecting badge. Export and upload failures use toasts with actionable messages.

### D10. Testing

- **Unit (Vitest)**: token generation, derivation, hashing, and role resolution; document factory and schema helpers; slide reorder/delete edge cases; clipboard envelope validation and ID reassignment; filename sanitization; zoom/coordinate math.
- **Integration (Vitest + PostgreSQL + MinIO)**: create/session APIs; upload validation and MIME handling; Hocuspocus authentication with edit and view tokens; read-only update rejection; document persistence across a collab restart; title mirroring.
- **End-to-end (Playwright)**: create and edit a deck, reload persistence, add text/shapes/arrows/images, copy/paste across decks and from the system clipboard, export PNG and PDF (verify page count), present and navigate, two-browser collaboration with cursors and selections, viewer cannot edit, reconnect after offline toggling, recents behavior, invalid/tampered links.
- **CI order**: lint → typecheck → unit → integration (containers) → Playwright. Artifacts include failure traces and exported PDFs for inspection.
- Tests never rely on public network access; fonts, images, and services are local.

### D11. Deployment and operations

- **Local**: `docker compose up` starts PostgreSQL and MinIO; `pnpm dev` runs web and collab together. Migrations and bucket creation are idempotent scripts.
- **Production**: two container images (`web`, `collab`), managed PostgreSQL, and an S3-compatible bucket. The collab service must run as a single long-lived instance with WebSocket support; do not deploy it to a serverless platform. Set `PUBLIC_APP_URL`, `COLLAB_WS_URL`, `DATABASE_URL`, and S3 credentials through the environment.
- **Health**: `/api/health` for web and a small HTTP health endpoint on the collab service. Readiness checks the database; liveness does not.
- **Backups**: PostgreSQL point-in-time recovery; object storage versioning optional. The Yjs snapshot plus asset objects is the complete deck.
- **Rollout**: apply additive migrations first, deploy collab, then web. A collab restart flushes pending stores; open clients reconnect and resync.
- **Observability**: structured logs with deck ID, role, connection count, and persistence failures; never tokens. Metrics for active documents, store latency, failed auth, and asset errors. No third-party analytics on deck pages because of the fragment token.
- **Scaling path**: add the Hocuspocus Redis extension and sticky routing for multiple collab instances; put a CDN in front of assets. Neither changes the document schema.

**Guardrails (configurable):** 100 slides per deck, 2,000 elements per deck, 10 MB per image, 10,000 characters per text element, 120 characters per title, 200 elements per clipboard paste, 5 MB WebSocket payload cap. The editor and collaboration server enforce the limits, and the UI reports them.

## Risks / Trade-offs

- **Capability links cannot be revoked** → Treat edit links as secrets: fragment tokens, no-referrer, strict CSP, no third-party scripts, and a visible warning in the share dialog. Add owner keys and link rotation as a future capability.
- **No accounts means no ownership or recovery** → The local recent list and copied links are the only ways back in. Clear onboarding copy. Losing browser storage loses the list, not the deck.
- **Single collaboration instance is a scaling and availability limit** → Document it, deploy one instance with restarts that flush state, and plan the Redis extension when needed.
- **A crash can lose the last few seconds of edits** → Debounced persistence with a 2 s/10 s bound, flush on shutdown, and PostgreSQL backups. Shortening the debounce trades database load for less loss.
- **Custom canvas work is substantial** → Keep v1 element types and styling intentionally small; use Konva primitives; exclude rich text, endpoint editing, and crop; cover interactions with Playwright.
- **Large images and decks can exhaust memory during export** → Enforce upload limits, downscale decoded images, render PDF pages sequentially, and show progress.
- **Concurrent transform and text edits can surprise users** → Property-level CRDT merges and per-user undo are the accepted model; remote selections and cursors make activity visible. No locking.
- **Fragment tokens are visible to browser extensions and history** → Limit scripts with CSP, avoid analytics on deck pages, and document that links are bearer secrets. Any link-based design has this exposure.
- **Asset URLs are secondary capabilities** → 128-bit IDs and immutable caching. A leaked image URL exposes that image; do not store confidential material unless that trade-off is acceptable.
- **Clipboard behavior differs across browsers** → Support custom MIME, HTML marker, and in-memory fallbacks; test Chromium, Firefox, and WebKit; degrade to text or image paste rather than corrupting elements.
- **Raster PDFs are larger and non-selectable** → Accepted for fidelity in v1; vector export is future work.
- **No deletion/retention controls** → Cascading schema supports future deletion; run a cleanup job for orphaned assets. Until then, decks persist indefinitely.

## Migration Plan

This is a new system, so there is no data migration.

1. Scaffold the workspace, shared packages, Docker Compose services, and schema migrations.
2. Bring up PostgreSQL and MinIO; apply migrations; create the private bucket.
3. Implement and test the document schema, token helpers, and clipboard codec in `packages/deck`.
4. Implement the collab service with auth, read-only enforcement, persistence, and awareness.
5. Implement the web session APIs and asset pipeline, then the editor, viewer, share, presentation, and export flows.
6. Run the unit, integration, and Playwright suites against the container stack.
7. Deploy collab and web with additive migrations. Rollback is an image redeploy; the document schema stays backward compatible within `schemaVersion`. Never make destructive schema changes without a paired data migration.

## Open Questions

- Which production container platform and object-storage vendor to use. The architecture only assumes a long-lived Node container, managed PostgreSQL, and an S3-compatible bucket, so this can be decided at deployment time.
- Whether the asset proxy should eventually move behind a CDN. This affects performance and bandwidth, not the deck model or APIs.
