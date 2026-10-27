# Tasks

## 1. Container Runtime Pieces

- [x] 1.1 Add `http-proxy` as a root dependency and update the lockfile; verify `pnpm install --frozen-lockfile` and `pnpm build` succeed.
- [x] 1.2 Add `docker/pglite-server.mjs` bound to `127.0.0.1`, reading `PGLITE_PORT` and `PGLITE_DATA_DIR`, with `maxConnections` at 50 and graceful shutdown; verify a Node test starts it against a temporary directory, connects with the `postgres` client, and runs `select 1`.
- [x] 1.3 Add `docker/proxy.mjs` that routes `/collab` HTTP and WebSocket traffic to port 1234 and all other paths to port 3000, sets `X-Forwarded-For`, and returns a gateway error when an upstream fails; verify a Node test with stub upstreams covers HTTP routing, WebSocket upgrade, and forwarded client IP.
- [x] 1.4 Add `docker/entrypoint.sh` that starts PGlite, waits for its port, applies migrations, starts the web server bound to `127.0.0.1:3000`, the collaboration server bound to `127.0.0.1:1234`, and the proxy on `0.0.0.0:8080`, and forwards termination signals; verify `bash -n docker/entrypoint.sh` passes and a container run logs each startup phase in order.
- [x] 1.5 Update `.dockerignore` to exclude `.env*` and confirm the existing exclusions for `node_modules`, `.next`, `dist`, `.data`, and test artifacts; verify a built image contains neither `/app/.env` nor `/app/.env.local`.

## 2. Single-Container Image and Compose

- [x] 2.1 Add a root `Dockerfile` using `node:24-bookworm-slim`, pnpm 11.17.0, a build stage for packages/web/collab, `NEXT_PUBLIC_COLLAB_WS_URL=/collab`, `tini`, a non-root runtime user, a writable `/data`, a `/api/health` health check, and the entrypoint; verify `docker build -t mini-deck:test .` succeeds. Keep the pragmatic v1 shape (full workspace and dev dependencies); standalone slimming is out of scope.
- [x] 2.2 Add `compose.single.yml` with one service, `8080:8080`, a named volume at `/data`, and `restart: unless-stopped`; verify `docker compose -f compose.single.yml config --quiet` passes and `docker compose -f compose.single.yml up -d --build` reaches a healthy state.
- [x] 2.3 Verify image hygiene and runtime isolation: no `.env*` files in the image, `id -u` returns a non-zero UID, `/data` is writable, and only port 8080 is published; record the exact commands in the container documentation.
- [x] 2.4 Verify the Docker health check reports healthy through `/api/health`; stop the web process and record whether the container becomes unhealthy before fail-fast exits it. `docker inspect` must show the expected health state.

## 3. Startup, Migrations, and Persistence

- [x] 3.1 Implement the migration step in the entrypoint using the explicit `DATABASE_URL`, never `scripts/db-migrate.sh`; verify a fresh volume creates the schema and `/api/health` returns 200.
- [x] 3.2 Implement fail-fast supervision in the entrypoint; verify killing either the web, collab, or PGlite process stops the remaining processes and exits the container.
- [x] 3.3 Verify migration failure prevents startup by running the image with `DATABASE_URL` pointed at an unreachable port; the container exits non-zero and never serves the app.
- [x] 3.4 Verify restart idempotence: restart the container with the same volume and confirm migrations are already applied and the app serves normally.
- [x] 3.5 Verify persistence and graceful shutdown: create a deck, make an edit, upload an image, stop the container with `SIGTERM`, recreate it with the same `/data` volume, and confirm the edit and image remain available.
- [x] 3.6 Verify upgrade migrations by building a throwaway image with one additional migration and starting it against a volume created by the previous image; confirm the migration applies before the app serves and the existing deck remains available.

## 4. Routing, Client, and CSP

- [x] 4.1 Build the web app with `NEXT_PUBLIC_COLLAB_WS_URL=/collab` and update `apps/web/src/proxy.ts` to omit a relative collab value from `connect-src` while retaining `'self' ws: wss:`; preserve the absolute-URL form for the two-image deployment. Verify `pnpm lint`, `pnpm typecheck`, a header test for both URL forms, and no CSP console violations over HTTP.
- [x] 4.2 Verify the built browser bundle uses `/collab` and contains no hardcoded `localhost:1234`; verify the same image works when the host port is remapped, for example with `-p 9080:8080`.
- [x] 4.3 Verify `/` and `/api/health` are served by the web app, `/collab` upgrades to WebSocket, and internal ports 3000, 1234, and 5433 are bound to loopback and not published; check the listening addresses via `/proc/net/tcp` or an equivalent in-container tool.
- [x] 4.4 Add a Playwright container smoke test covering two-browser editing and image upload through the published port; verify the test passes against the built image.
- [x] 4.5 Verify the same image behind a local HTTPS reverse proxy with a self-signed certificate; confirm two browsers collaborate over `wss://<host>/collab` without rebuilding and no CSP violations appear.

## 5. Operations and Documentation

- [x] 5.1 Add `docs/single-container.md` covering quickstart, environment, external TLS proxy setup, backup/restore, upgrade/rollback, and the PGlite/single-instance limits; verify every documented command against `mini-deck:test`.
- [x] 5.2 Update `README.md` with a single-container section and link to the new guide; verify the documented `docker run` and Compose commands work as written.
- [x] 5.3 Add a backup/restore drill: stop the container, archive `/data`, restore into a fresh volume, and confirm the deck and image are available; record the commands in the guide.
- [x] 5.4 Document that the two-image production path remains supported and that importing existing PostgreSQL data into this mode is out of scope; verify `docker compose -f docker-compose.prod.yml config --quiet` still passes.

## 6. Integration Verification

- [x] 6.1 Run the full acceptance flow on a fresh volume: build, start, health check, create a deck, edit from two browsers, upload an image, export a PDF, restart, and restore from backup; verify every step succeeds.
- [x] 6.2 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`; verify all pass.
- [x] 6.3 Build both existing app images and validate the production Compose file; verify the existing two-image path still works and is not replaced by the single-container files.

## Workflow Follow-up

- Archive the change after the acceptance flow and project review requirements are satisfied.
- Verify the archived change and the `container-deployment` spec.
