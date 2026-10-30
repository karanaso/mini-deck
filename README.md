# Mini Deck

A link-first collaborative slide deck. Create a small 16:9 deck, share an edit or view link, and build it together in real time. No accounts, no file attachments.

See `openspec/changes/add-collaborative-decks/` for the proposal, capability specs, design, and implementation checklist.

## Stack

- **Web**: Next.js 16 App Router, React 19, Tailwind CSS, shadcn-style components
- **Canvas**: Konva / react-konva
- **Collaboration**: Yjs + Hocuspocus v4 over WebSocket
- **Storage**: PostgreSQL for deck metadata and Yjs snapshots; S3-compatible storage for images
- **Exports**: PNG and PDF generated in the browser from the shared slide renderer

The workspace has two runtime apps (`apps/web`, `apps/collab`), two shared packages (`packages/deck`, `packages/db`), and a test suite split into unit, integration, and Playwright suites.

## Prerequisites

- Node.js 22 or newer (Node 24 recommended)
- pnpm 11
- Docker and Docker Compose if you want the containerized PostgreSQL/MinIO pair, the single-container self-host, or the two-image production stack

For local development without Docker, the repository can run a project-local PGlite socket server (PostgreSQL-compatible) and a filesystem asset store. Everything stays under `.data/`.

## Quickstart (no Docker required)

```bash
cp .env.example .env
pnpm install
pnpm dev
```

`pnpm dev` starts the project-local PGlite database if needed, applies migrations, then starts the web app and collaboration server. It prints the actual web URL. If port 3000 is already occupied, it automatically uses port 3100.

Open:

- App: http://localhost:3000 (or the URL printed by `pnpm dev`)
- Collaboration WebSocket: ws://localhost:1234
- Health: http://localhost:3000/api/health and http://localhost:1234/health

To run the database separately:

```bash
pnpm db:start
pnpm db:migrate
pnpm storage:ensure
pnpm dev
```

Stop the local database with `pnpm db:stop`.

### Infrastructure-only Docker stack

This starts PostgreSQL and MinIO only; run the app with `pnpm dev` on the host. The `docker-compose.prod.yml` file is the separate two-image production stack documented in `docs/deployment.md`.

```bash
docker compose up -d --wait
pnpm db:migrate
pnpm storage:ensure
```

Docker Compose exposes PostgreSQL on `5433` and MinIO on `9000`/`9001`. Set `STORAGE_DRIVER=s3` in `.env` to use MinIO; the default local filesystem store needs no bucket.

### Single-container self-host

Run the whole app in one container with embedded PGlite and local asset storage:

```bash
docker compose -f compose.single.yml up -d --build --wait
```

Open <http://localhost:8080>. All state lives in the `mini-deck-data` volume. TLS is expected at an external reverse proxy; see [docs/single-container.md](docs/single-container.md) for proxy examples, backup and restore, upgrades, and the PGlite limits.

The Compose file publishes only port `8080`. The web app, collaboration server, database, and internal proxy run inside the container; internal ports bind to loopback.

## Environment

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection | `postgres://postgres:postgres@127.0.0.1:5432/minideck` |
| `PUBLIC_APP_URL` | Browser origin used by docs and deployment | `http://localhost:3000` |
| `NEXT_PUBLIC_COLLAB_WS_URL` | WebSocket URL embedded in the browser bundle | `ws://localhost:1234` |
| `COLLAB_PORT` | Hocuspocus port | `1234` |
| `COLLAB_DEBOUNCE_MS` | Document persistence debounce | `2000` |
| `STORAGE_DRIVER` | `local` or `s3` | `local` |
| `STORAGE_DIR` | Local asset directory | `.data/assets` |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | S3-compatible storage | MinIO defaults |
| `DECK_CREATE_RATE_LIMIT` | Deck creations per minute per IP | `100` |
| `AUTH_FAILURE_RATE_LIMIT` | Failed token attempts per minute per IP | `60` |
| `IMAGE_SEARCH_RATE_LIMIT` | Stock image searches per minute per IP | `60` |
| `IMAGE_IMPORT_RATE_LIMIT` | Stock image imports per minute per IP | `30` |
| `DECK_SESSION_SECRET` | Signs 30-day unlock sessions; required in production (32+ chars), shared by web and collab | dev fallback |
| `JOIN_LOOKUP_RATE_LIMIT` | Join-code lookups per 15 minutes per IP | `20` |
| `JOIN_CODE_ATTEMPT_RATE_LIMIT` | Join-code attempts per 15 minutes per code | `50` |
| `PIN_ATTEMPT_RATE_LIMIT` | PIN attempts per 15 minutes per IP | `10` |
| `PIN_DECK_ATTEMPT_RATE_LIMIT` | PIN attempts per 15 minutes per deck | `50` |
| `UNSPLASH_ACCESS_KEY` | Unsplash Access Key; enables Unsplash search when set | unset |
| `PEXELS_API_KEY` | Pexels API key; enables Pexels search when set | unset |

## Deck access

New decks receive a seven-digit join code and two six-digit role PINs: one for editing and one for read-only viewing. The creation flow shows all three once and keeps them in that browser. A protected deck can be opened from the landing page by join code or through its edit/view link, but the matching role PIN is required before content loads. Unlocks are remembered for 30 days in that browser.

The share dialog shows the code and PINs on a browser that holds them and lets an editor reset all three values. Resetting invalidates old values and existing unlock sessions. Existing decks keep their link-only behavior and have no join code or PINs.

Set `DECK_SESSION_SECRET` to the same 32+ character value on the web and collaboration services in production. Development uses a dev-only fallback. See `docs/sharing.md`, `docs/api.md`, and `docs/deployment.md` for the flow, routes, and deploy order.

## Stock image search

Editors can search Unsplash and Pexels from the image menu. A provider is available only when its key is set in the server environment; no key is sent to the browser. Searches are proxied through the app, and importing a photo downloads it once, re-encodes it with the same pipeline as an upload, and stores it as a deck asset. The deck never depends on the provider URL, so imported photos keep working if the provider removes them.

Search results show the photographer and provider, and imported images retain that credit in the deck. Operators are responsible for complying with each provider's terms and attribution guidelines. Unsplash imports also trigger the provider's download-tracking endpoint.

Without provider keys, stock image search is hidden and uploads, pastes, collaboration, presentation, and export are unchanged. No database or deck migration is required. See `docs/deployment.md` and `docs/api.md` for the route and configuration details.

## Commands

```bash
pnpm dev               # start/migrate DB, then run web + collab
pnpm build             # production build for both apps
pnpm lint              # ESLint
pnpm typecheck         # TypeScript project checks
pnpm test              # Vitest unit tests
pnpm test:integration  # PostgreSQL + storage integration tests (starts PGlite)
pnpm test:e2e          # Playwright end-to-end suite (builds and starts the stack)
pnpm test:container    # Node tests for the container PGlite server and proxy
pnpm test:container:e2e # Playwright smoke test against a running single container
pnpm ci:check          # lint + typecheck + build + unit tests
pnpm db:generate       # generate a Drizzle migration
pnpm db:migrate        # start local DB if needed, then apply migrations
pnpm db:stop           # stop the local PGlite server
pnpm storage:ensure    # create the local directory or S3 bucket
```

## Localization

The web interface is available in English and Greek. It follows the browser's `Accept-Language` preference on first visit, defaults to English, and provides a language switcher on the landing page and in the editor/viewer top bar. The choice is stored in a `mini-deck-locale` cookie. Share links carry the editor's language as `?lang=en` or `?lang=el`, which takes precedence for the first open and is remembered. The language hint is presentation-only; capability tokens, deck content, and collaboration data are not affected.

See `docs/localization.md` for the resolution order, dictionary workflow, Greek glossary, API error mapping, and translation review checklist.

## Architecture at a glance

- The Yjs document is the source of truth for deck content. PostgreSQL stores a binary snapshot after debounced changes.
- Each deck is addressed by an unguessable deck ID plus an edit or view token in the URL fragment. The fragment is never sent in the initial HTTP request. Share links also carry a presentation-only `lang` query parameter; the proxy consumes it and redirects to the clean URL before the deck renders.
- View tokens are derived from the edit token with a one-way HMAC; the collaboration server marks view connections read-only.
- The editor and export flows share the same 1920×1080 slide renderer, so presentations and downloads match the canvas.
- Recent decks are stored in `localStorage` only. Clearing browser storage loses the list, not the deck or its links.

## Testing notes

- Unit tests live beside `packages/*` and in `apps/*/test`.
- Integration tests use the project-local PGlite socket server when `pnpm test:integration` starts it. In CI they use the PostgreSQL service.
- Playwright tests use the installed system Chrome (`channel: "chrome"`). In CI, install Chromium with `pnpm exec playwright install --with-deps chromium` and set `PLAYWRIGHT_CHANNEL=chromium` if Chrome is unavailable.

## Troubleshooting

- **`EADDRINUSE` on 3000/1234/5432**: stop the previous process or change the matching environment variable/port.
- **`PGlite failed to start`**: inspect `.data/pglite.log`; remove `.data/pglite` only if you intend to discard local data.
- **WebSocket shows Offline**: verify the collab service is running and `NEXT_PUBLIC_COLLAB_WS_URL` matches its host/port. A rebuild is required after changing public env values.
- **Single-container WebSocket shows Offline**: the external TLS proxy must forward `/collab` WebSocket upgrades to port `8080`; see `docs/single-container.md`.
- **Images fail to upload**: check `sharp` installed successfully (`pnpm rebuild sharp`), and for S3 verify the bucket exists with `pnpm storage:ensure`.
- **Decks disappear from the landing page**: recent decks live in browser storage only; use the saved edit link to reopen a deck.

## License

Private prototype. No license has been granted yet.
# mini-deck
