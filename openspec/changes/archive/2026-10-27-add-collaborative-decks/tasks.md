# Tasks

## 1. Workspace, tooling, and infrastructure

- [x] 1.1 Initialize the pnpm workspace with `apps/web`, `apps/collab`, `packages/deck`, and `packages/db`; add root scripts for dev, build, lint, typecheck, test, integration, and e2e. Verify `pnpm install` completes and all workspace packages resolve.
- [x] 1.2 Add shared TypeScript configs, ESLint, Prettier, and a Node 22+ engine requirement; configure `transpilePackages` in the web app and a production build for the collab service. Verify `pnpm lint` and `pnpm typecheck` pass.
- [x] 1.3 Add Docker Compose services for PostgreSQL and MinIO with health checks, an env template, and an idempotent bucket-creation script. Verify `docker compose up -d --wait` reports healthy services and the bucket exists.
- [x] 1.4 Add a CI workflow that installs dependencies, starts PostgreSQL/MinIO, and runs the repository's `ci:check` command (lint, typecheck, build, and available test suites), with integration and Playwright scripts wired in so they run once their suites land. Verify the workflow YAML passes `actionlint` and `pnpm ci:check` runs locally.
- [x] 1.5 Write the root README covering prerequisites, local startup, service URLs, migrations, and test commands. Verify the documented quickstart works from a clean shell.

## 2. Database and shared deck model

- [x] 2.1 Implement the Drizzle schema and initial migration for `decks`, `deck_documents`, and `deck_assets` with the designed columns, foreign keys, and indexes. Verify `pnpm db:migrate` applies cleanly and `psql` shows all three tables.
- [x] 2.2 Implement capability token helpers: edit-token generation, deck-bound view-token derivation, SHA-256 hashing, and timing-safe role resolution. Verify Vitest covers derivation determinism, one-way behavior, and edit/view/invalid outcomes.
- [x] 2.3 Define the Yjs deck schema, slide and element types, 1920×1080 constants, zod validators, and `createInitialDeckDoc()` with one blank slide. Verify unit tests cover element validation, schema version, and document initialization.
- [x] 2.4 Implement slide and element operations: add, duplicate, delete with last-slide protection, reorder, bring forward/send backward, and text-element creation with a nested `Y.Text`. Verify tests cover each operation and two-document concurrent merges for element properties and text.
- [x] 2.5 Implement the clipboard codec: versioned envelope, zod parsing, size/element caps, new-ID assignment, relative-position preservation, and paste offset. Verify unit tests cover valid envelopes, malformed input, caps, and cross-deck ID regeneration.
- [x] 2.6 Add the database client and integration-test harness that truncates tables and resets the MinIO bucket between tests. Verify a sample integration test connects to PostgreSQL, writes and reads a row, and cleans up.
- [x] 2.7 Write `docs/documents.md` describing the Yjs tree, element fields, z-order, text merging, and schema versioning. Verify every documented field exists in `packages/deck` and the referenced tests pass.

## 3. Web APIs and asset pipeline

- [x] 3.1 Implement `POST /api/decks` to generate tokens, store hashes, write the initial Yjs document in a transaction, and return the deck ID and edit token. Verify integration tests cover creation, hashed storage, initial slide, and invalid input.
- [x] 3.2 Implement `POST /api/decks/[deckId]/session` with bearer-token validation, edit/view role resolution, a generic 404 for bad links, and no token in responses. Verify integration tests cover edit, view, tampered, and unknown-deck cases.
- [x] 3.3 Implement the image upload route with edit-token authorization, multipart parsing, a 10 MB cap, PNG/JPEG/WebP allowlisting, `sharp` decoding/re-encoding, dimension capture, S3 storage, and a `deck_assets` row. Verify integration tests cover success, oversized files, SVG rejection, corrupt data, and viewer rejection.
- [x] 3.4 Implement asset delivery at `/api/assets/[assetId]` with streaming from S3, stored MIME type, `nosniff`, immutable caching, and 404 for unknown IDs. Verify integration tests check headers, body bytes, and unknown IDs.
- [x] 3.5 Add zod-validated environment configuration, a structured API error envelope, and `GET /api/health` that checks database connectivity. Verify unit tests cover invalid env and integration tests cover healthy and database-down health responses.
- [x] 3.6 Add shared rate-limit utilities and apply configurable limits to deck creation and failed token attempts. Verify unit tests cover refill and rejection behavior, and integration tests cover a throttled client.
- [x] 3.7 Add security middleware for CSP with the collab origin, `Referrer-Policy: no-referrer`, `Cache-Control: no-store` on deck routes, `frame-ancestors 'none'`, `nosniff`, and same-origin CORS for APIs. Verify integration tests assert the headers on deck shell, session, and asset responses.
- [x] 3.8 Write `docs/api.md` with request/response examples for deck creation, session, upload, and asset delivery, plus a smoke script. Verify the smoke script runs against the local stack and exercises every documented endpoint.

## 4. Collaboration service

- [x] 4.1 Bootstrap the Hocuspocus v4 server with env validation, configurable port, health endpoint, connection limits, and graceful shutdown. Verify the service starts, reports healthy, and exits cleanly on SIGTERM.
- [x] 4.2 Implement `onAuthenticate` to resolve the deck and token role, reject invalid tokens, return the role in context, and set `connection.readOnly` for viewers. Verify integration tests cover edit and view connections, invalid tokens, and a forged document update from a viewer being rejected.
- [x] 4.3 Implement document loading and debounced persistence against `deck_documents`, including initial-document fallback and flush on shutdown. Verify integration tests restart the service and reload the same slide and element state.
- [x] 4.4 Mirror `meta.title` into `decks.title` during document storage without losing document state when the mirror fails; ensure deck timestamps update. Verify integration tests cover title changes, no-op loads, and persistence after restart.
- [x] 4.5 Validate awareness payload shape and size, broadcast presence/cursor/selection state, and remove awareness on disconnect. Verify integration tests cover valid awareness, malformed payloads, and disconnect cleanup.
- [x] 4.6 Add connection/document metrics logging with redacted tokens, payload caps, and maximum open documents per connection. Verify tests confirm tokens never appear in log output and oversized messages are refused.
- [x] 4.7 Write `docs/collaboration.md` covering auth, read-only enforcement, persistence debounce, reconnect behavior, limits, and the single-instance scaling caveat. Verify the documented commands start the service and the referenced integration tests pass.

## 5. Web shell, landing page, and sharing

- [x] 5.1 Build the Next.js app shell with the Inter font, Tailwind, shadcn/ui primitives, toast provider, error boundary, and a not-found page. Verify `pnpm build` succeeds and a Playwright smoke test loads the landing page without console errors.
- [x] 5.2 Implement the device-local recent-decks store with add, title update, remove, sort by last opened, and corrupted-data recovery. Verify Vitest covers persistence, updates, removal, and malformed storage.
- [x] 5.3 Build the landing page with **New deck**, recent-deck cards, and removal actions wired to `POST /api/decks`. Verify Playwright creates a deck, lands in the editor with one blank slide, returns to the landing page, sees the recent entry, and removes it.
- [x] 5.4 Build the `/d/[deckId]` client shell that reads the fragment token, resolves the session, distinguishes editor from viewer, and shows loading, not-found, and retry states. Verify Playwright covers edit, view, missing-token, and tampered-token links.
- [x] 5.5 Implement the editor-only share dialog that derives the view link locally, labels both roles, copies either link, and warns that links are bearer secrets. Verify unit tests cover derivation and Playwright covers copy feedback and the absence of the dialog for viewers.
- [x] 5.6 Verify link privacy in the browser: the fragment token is absent from the initial document request, API requests use the authorization header, and deck responses send no-referrer and no-store headers. Verify Playwright network assertions and security-header checks pass.
- [x] 5.7 Write `docs/sharing.md` explaining the capability model, URL format, token derivation, role resolution, and the no-revocation limitation. Verify the examples match the token helpers and the linked tests pass.

## 6. Collaboration client and editor chrome

- [x] 6.1 Implement the deck provider that creates the Y.Doc, connects the Hocuspocus provider with the capability token, initializes awareness, installs the undo manager, and exposes connection state. Verify an integration test connects two clients and observes a shared document update.
- [x] 6.2 Implement the Yjs React adapter with scoped `useSyncExternalStore` subscriptions and a local UI store for current slide, zoom, tool, and dialogs. Verify unit tests cover subscription cleanup and re-render isolation for unrelated slices.
- [x] 6.3 Build the editor top bar with inline deck-title rename, presence avatars, connection badge, and Share, Present, and Export entry points. Verify Playwright renames a deck, sees the title in a second context and in the landing recent list, and rejects an empty title.
- [x] 6.4 Implement the generated participant identity (name and color) with session-scoped persistence and a rename control. Verify Playwright shows distinct participants in two contexts and updates the name for the other participant.
- [x] 6.5 Handle provider disconnect, reconnect, and sync state in the UI, keeping local edits while disconnected. Verify a Playwright test toggles offline, makes an edit, reconnects, and observes the edit without duplicates.
- [x] 6.6 Write `docs/editor-architecture.md` describing providers, state ownership, awareness fields, and the role split. Verify the document matches the implemented hooks and the collaboration tests pass.

## 7. Canvas editing

- [x] 7.1 Build the Konva stage with content, selection, and overlay layers; scale and clip the 1920×1080 slide; add zoom controls and an empty-slide toolbar. Verify Playwright loads a blank deck, changes zoom, and sees no content outside the slide frame.
- [x] 7.2 Implement click selection, Shift multi-select, marquee selection, Transformer handles, and delete. Verify Playwright selects one and multiple elements, clears the selection on empty canvas, and deletes them.
- [x] 7.3 Implement move, resize, rotate, Shift aspect lock, arrow-key nudge, Shift nudge, and gesture grouping into Yjs transactions. Verify Playwright performs each transform and a unit test covers coordinate conversion and nudge amounts.
- [x] 7.4 Implement rectangle, ellipse, and arrow creation from the toolbar, plus duplication and bring-forward/send-backward controls. Verify Playwright creates each type, duplicates it, and checks stacking behavior visually or via element order.
- [x] 7.5 Implement the text tool with creation, inline editing, empty-text removal, and persistence through the nested `Y.Text`. Verify Playwright adds and edits text and sees it after reload; the two-document merge test covers concurrent typing.
- [x] 7.6 Build the style panel for shape fill/stroke/width, arrow stroke, and text size/color/alignment, with changes written to the selected elements. Verify Playwright changes each style and sees it update in a second context.
- [x] 7.7 Add keyboard handling for delete, arrow-key nudge, Shift nudge, and slide navigation, suppressed while typing in inputs. Verify Playwright exercises each shortcut and confirms typing in the title or text editor does not trigger them.

## 8. Slides, thumbnails, presence overlays, and undo

- [x] 8.1 Build the slide rail with add, duplicate, delete, selection, and drag reorder, enforcing at least one slide. Verify Playwright covers each action and a two-context test sees the reordered list.
- [x] 8.2 Implement the shared `renderSlideToCanvas` renderer and debounced in-memory thumbnails used by the slide rail. Verify renderer tests produce the expected dimensions and thumbnails update after an element change.
- [x] 8.3 Render remote cursors with names/colors on the matching slide and remote selection outlines, hiding them for another slide and on disconnect. Verify a two-context Playwright test observes cursor and selection changes and their removal.
- [x] 8.4 Wire the `Y.UndoManager` to local transactions only, group drags and typing, cap history, and expose undo/redo buttons and keyboard shortcuts. Verify a two-context Playwright test confirms undo reverts only the local participant's edit and the shortcuts work outside text inputs.
- [x] 8.5 Handle slide deletion while another participant is viewing it by moving that participant to an adjacent slide, and keep both participants' slide lists in sync. Verify a two-context Playwright test covers this fallback.

## 9. Images and clipboard

- [x] 9.1 Wire the image tool and upload flow to the asset API, render uploaded images on the canvas, and show actionable errors for oversized or unsupported files. Verify Playwright uploads a PNG, sees it in a second context and after reload, and receives an error for a 15 MB file and an SVG.
- [x] 9.2 Implement image paste from the system clipboard through the upload pipeline, inserting at the visible slide center. Verify Playwright pastes an image from a `DataTransfer` and sees the rendered element.
- [x] 9.3 Implement plain-text paste as a new text element at the visible slide center, ignoring empty and whitespace-only input. Verify Playwright pastes multiline text and checks the resulting element content.
- [x] 9.4 Implement copy, cut, and paste for elements within a slide, across slides, and across decks, including same-tab memory, custom MIME, HTML-marker fallbacks, and keyboard shortcuts. Verify Playwright covers same-slide, cross-slide, and cross-deck paste with preserved relative positions and new IDs.
- [x] 9.5 Add clipboard security and limit tests: malformed envelopes, unknown fields, over-limit payloads, and read-only paste attempts. Verify unit and Playwright tests confirm nothing is inserted or executed.
- [x] 9.6 Write `docs/clipboard.md` describing the envelope, fallbacks, precedence, limits, and cross-deck behavior. Verify the documented envelope matches the codec and the clipboard tests pass.

## 10. Viewer, presentation, and export

- [x] 10.1 Build the read-only viewer shell using the same canvas renderer, with navigation, presence, presentation, and export available but editing, upload, rename, and share controls absent. Verify Playwright opens a view link, sees live editor updates, and cannot reach editing or share actions.
- [x] 10.2 Implement presentation mode as a full-screen overlay with fitted slides, keyboard navigation, slide counter, Escape exit, and hidden collaboration/editor chrome. Verify Playwright starts from a chosen slide, navigates forward and back, and returns to the same slide on exit.
- [x] 10.3 Implement PNG export of the current slide at 1920×1080 with clipping, background, asset rendering, and a sanitized title/number filename. Verify Playwright downloads the PNG, checks dimensions and pixels, and confirms no overlay artifacts.
- [x] 10.4 Implement PDF export of all slides in order with sequential rendering, progress, embedded images, 16:9 pages, and abort-on-error without a partial download. Verify Playwright reorders slides, parses the PDF page count and order, checks fidelity on a styled/rotated slide, asserts the progress indicator, simulates an image failure, and retries.
- [x] 10.5 Verify viewers can present and export while editors' presence, cursors, and selections are absent from presentation and both export formats; ensure exports use the latest local edits. Verify Playwright covers a viewer export, an export immediately after an edit, and overlay absence in presentation.
- [x] 10.6 Write `docs/export.md` describing rasterization, page size, filenames, progress, failure behavior, and the viewer permission. Verify the documented behaviors match the Playwright export suite.

## 11. Hardening, integration, and deployment

- [x] 11.1 Enforce the configured deck, element, text, title, clipboard, image, and WebSocket limits across client, API, and collaboration server, with user-facing messages. Verify unit and integration tests cover every limit and Playwright shows the relevant errors.
- [x] 11.2 Run a security review covering CSP, no-referrer, fragment-token handling, token redaction in logs, timing-safe comparison, asset MIME enforcement, forged viewer writes, and malformed clipboard/awareness data. Verify the security test suite passes and findings are documented.
- [x] 11.3 Add keyboard-only editor checks, focus management for dialogs, labels for toolbar controls, and a responsive read-only viewer; run axe on landing, editor, viewer, and presentation. Verify Playwright and axe report no serious or critical violations.
- [x] 11.4 Create a 30-slide/500-element performance fixture and measure initial load, slide switching, thumbnail generation, and PDF export. Verify timings are recorded in `docs/performance.md` and no operation blocks the main thread beyond the documented budget.
- [x] 11.5 Add production Dockerfiles for web and collab, a production compose example, health checks, and build scripts. Verify `docker build` succeeds for both images and `docker compose config` validates the example.
- [x] 11.6 Write `docs/deployment.md` with environment variables, migration order, S3 setup, backup/restore, rollback, and the single-instance collab constraint. Verify every command runs against the local stack and the runbook references the correct health endpoints.
- [x] 11.7 Run the complete Playwright suite across the four capability specs, including two-context collaboration, reconnect, read-only enforcement, clipboard, presentation, and export. Verify `pnpm test:e2e` passes in CI.
- [x] 11.8 Refresh the README with the final architecture, service map, and troubleshooting for database, storage, and WebSocket failures. Verify a clean checkout can follow the quickstart to create and collaborate on a deck.

## Workflow follow-up

- Review the completed change and archive it with `/opsx-archive` once all verification tasks pass.
- Confirm the archived specs preserve the four capability purposes and the link-sharing limitations.
