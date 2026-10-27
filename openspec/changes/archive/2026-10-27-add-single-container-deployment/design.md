# Design

## Context

The repository already supports two deployment shapes: a no-Docker development path using PGlite and local files, and a production path with separate web and collaboration images plus PostgreSQL and S3-compatible storage. The production path is documented in `docs/deployment.md`; the images live in `apps/web/Dockerfile` and `apps/collab/Dockerfile`.

This change adds a third shape: one self-contained container for small self-hosted instances. It does not replace the existing shapes. The app remains two runtime processes; the container is a single deployment unit built around the local-development stack.

Constraints that shape the design:

- The web app and collaboration server must remain separate processes. A single Next.js custom server hosting WebSockets was rejected in the original architecture and is not reintroduced here.
- PGlite is a WASM PostgreSQL build with a socket multiplexer. It is single-process and is not a full PostgreSQL server for high concurrency.
- The collab service is a single long-lived instance in v1.
- TLS terminates at an external reverse proxy. The container speaks plain HTTP.
- The app uses capability links, not accounts. No new authentication mechanism is needed.

See `proposal.md` for motivation and `specs/container-deployment/spec.md` for the behavior contract.

## Goals / Non-Goals

**Goals:**

- One image, one published HTTP port, one mounted volume, one Compose service.
- The image works unchanged on localhost, a LAN host, or a public hostname behind an external TLS proxy.
- All durable state lives under `/data` and survives container replacement.
- Startup applies migrations before serving traffic; process failure stops the container instead of leaving a partial system.
- Keep the existing two-image deployment buildable and documented.

**Non-Goals:**

- TLS termination, certificate management, or automatic HTTPS inside the container.
- Horizontal scaling, multiple collaboration instances, or Redis fan-out.
- Point-in-time recovery, managed backups, or high availability.
- Importing existing external PostgreSQL data into PGlite.
- Replacing MinIO/S3 for deployments that need object storage.
- Minimal image size in the first version. The first image reuses the built workspace; standalone/production-only slimming is a follow-up.

## Decisions

### D1. One container, four processes, one supervisor

The container runs:

```text
tini
  `-- entrypoint
       |-- pglite socket server  :5433  (loopback only)
       |-- web                   :3000  (loopback only)
       |-- collab                :1234  (loopback only)
       `-- http/ws proxy         :8080  (published)
```

The entrypoint starts PGlite, waits for its TCP port, applies migrations, then starts web, collab, and the proxy. A small shell watchdog waits on PGlite and the combined application process. If either exits, it forwards `SIGTERM`, waits for shutdown, and exits the container. `concurrently -k` supervises the three application processes and prefixes their logs.

The collaboration server already handles `SIGTERM` by flushing pending stores and closing the database; the entrypoint must preserve that signal path.

Alternatives considered:

- **One Next.js custom server hosting HTTP and WebSockets.** Rejected. It couples deploys, complicates scaling, and was already rejected in the original design.
- **`s6-overlay`.** More robust per-service restarts and dependency ordering, but a larger operational concept for a small app. Whole-container restart is acceptable here.
- **A custom Node supervisor.** Full control, but more code to own and test. The shell entrypoint plus `concurrently` is smaller.

The container is not designed for independent process restarts. If any required process dies, Docker restarts the whole container under `restart: unless-stopped`.

### D2. PGlite with a raised connection ceiling

PGlite is already the repository's local database: `scripts/db-server.mts` starts a PGlite socket server and the app connects through the standard `postgres` driver. This change reuses that path with a container-specific data directory.

- PGlite binds `127.0.0.1:5433` and is never published.
- The socket server raises `maxConnections` above the current 20. The web and collaboration pools each use `max: 10`; a value such as 50 leaves room for migration and health activity.
- `DATABASE_URL` is `postgres://postgres:postgres@127.0.0.1:5433/minideck`.
- The data directory is `/data/pglite`; the PGlite server reads it from an explicit environment variable rather than the repository's `.data` path.

Alternatives considered:

- **PostgreSQL 17 inside the container.** More robust for real concurrency and standard backups, but requires `initdb`, a non-root database user, a larger image, and more startup supervision. Rejected for this mode; the existing two-image path already supports external PostgreSQL.
- **External PostgreSQL.** The most production-ready, but not all-in-one. Rejected for this mode by the chosen scope.
- **SQLite.** The schema and drivers are PostgreSQL-specific; switching would be an application change, not a packaging change.

The accepted limitations are single-process database execution, no `pg_dump`/PITR, and the PGlite multiplexer's "not all use cases guaranteed" warning. This mode targets personal and small-team instances. Larger deployments should use the existing images with managed PostgreSQL.

### D3. One published port with an internal Node proxy

The container publishes only `8080`. A small Node proxy using `http-proxy` routes:

- `/collab*` to the collaboration server on `127.0.0.1:1234`, including WebSocket upgrades.
- Everything else to the web app on `127.0.0.1:3000`.
- `X-Forwarded-For` is set/appended so the app's per-IP rate limiting sees the original client.

The web bundle is built with `NEXT_PUBLIC_COLLAB_WS_URL=/collab`. Because the browser resolves a relative WebSocket URL against the page, the same image uses `ws://host:8080/collab` on HTTP and `wss://host/collab` behind TLS. No hostname is baked at build time.

The Next proxy's CSP currently interpolates the collab URL into `connect-src`. When the configured URL is relative (this mode), omit the relative value and keep `connect-src 'self' ws: wss:`; when it is an absolute `ws`/`wss` URL (the two-image deployment), keep the existing `'self' <url> ws: wss:` form. The `ws:`/`wss:` allowances are required because `'self'` alone does not reliably cover WebSocket schemes in all browsers. This is a small change in `apps/web/src/proxy.ts`.

Alternatives considered:

- **Two published ports (3000 and 1234).** No proxy, but the image is not host-agnostic: the browser needs to know both host and port, and HTTPS requires two TLS endpoints. Rejected.
- **Caddy inside the container.** Needed only if the container terminates TLS; external TLS is the chosen scope. A Caddy binary also adds image size and certificate storage. Rejected.
- **Nginx inside the container.** Workable, but more configuration and writable runtime directories than the Node proxy. Rejected.
- **A custom Next server or API-route upgrade handler.** Next route handlers cannot upgrade WebSockets. Rejected.

Internal ports are bound to loopback where possible and are not published. Only the proxy is reachable from outside the container.

### D4. Local filesystem assets

`STORAGE_DRIVER=local` and `STORAGE_DIR=/data/assets` replace MinIO. The web app already streams assets through `/api/assets/{assetId}`, so no application change is needed.

Alternatives considered:

- **MinIO inside the container.** Adds a second database-like service, more processes, and image weight. Rejected.
- **External S3.** Useful for larger deployments, but breaks the all-in-one property. The existing S3 path remains available.

### D5. Startup migrations, not web-startup migrations

The entrypoint owns schema setup:

1. Start PGlite.
2. Wait for the TCP port.
3. Run Drizzle migrations with the explicit `DATABASE_URL`.
4. Start web, collab, and the proxy.

The existing `scripts/db-migrate.sh` must not be used in the container. It sources `.env` and can start a development PGlite instance, which is exactly the wrong behavior here. The entrypoint calls the database package's migration script directly or a dedicated runtime migrator.

The first version uses the existing `drizzle-kit` migration path, which is available because the pragmatic image includes dev dependencies. If the image is slimmed later, replace this with `drizzle-orm/postgres-js/migrator` or an equivalent runtime migrator so production dependencies are sufficient.

Alternatives considered:

- **Run migrations from the web process.** Rejected: races with collab startup, complicates multiple web replicas, and encourages the `.env` behavior above.
- **A separate migration container.** Stronger for orchestrators, but violates the one-container goal. The entrypoint approach is idempotent and adequate here.

### D6. Pragmatic image first

The first image is intentionally simple:

- Base `node:24-bookworm-slim` with pnpm 11.17.0 installed globally, so the non-root runtime user does not depend on a corepack download.
- Builder installs all dependencies, builds `packages/deck`, `packages/db`, the web app, and the collab server.
- Runtime copies the built workspace, installs `tini` and `procps` (for `concurrently` process cleanup), adds the entrypoint and proxy, creates `/data`, and runs as the `node` user.
- Build-time `NEXT_PUBLIC_COLLAB_WS_URL=/collab`.
- Runtime exposes `8080`; health check calls `/api/health` through the proxy.
- `.dockerignore` excludes `.env*`, `.data`, `node_modules`, `.next`, `dist`, test artifacts, and repository metadata, so no development environment file is baked into the image.

This image is larger than necessary because it keeps the workspace and dev dependencies. A follow-up can introduce Next.js standalone output, production-only collab packaging, and a runtime migrator. Keeping that optimization out of the first version reduces the risk of a monorepo tracing or pnpm deploy failure before the container works at all.

Alternatives considered:

- **Reuse the two app images with a sidecar proxy and database.** That is a multi-container deployment, not the chosen shape.
- **Lean image immediately.** Better size and attack surface, but more failure modes. Deferred.

### D7. Configuration and secrets

The container requires no secret database password or object-storage credentials; the PGlite connection string uses placeholder credentials that are not used for authentication. Configuration is explicit:

```text
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/minideck
PGLITE_DATA_DIR=/data/pglite
STORAGE_DRIVER=local
STORAGE_DIR=/data/assets
COLLAB_HOST=127.0.0.1
COLLAB_PORT=1234
NEXT_PUBLIC_COLLAB_WS_URL=/collab
PUBLIC_APP_URL=<optional public origin>
```

`PUBLIC_APP_URL` is currently unused by runtime code; it is documented as optional. Rate limits and collaboration tuning keep their existing defaults. The external TLS proxy is responsible for HTTPS and for preserving `X-Forwarded-For` from trusted clients.

### D8. Health and observability

- The Docker health check requests `/api/health` through the published port. That endpoint checks database reachability.
- The collab service's own `/health` remains available inside the container for direct checks.
- All processes log to stdout/stderr; `concurrently` prefixes web, collab, and proxy output. PGlite logs to stdout.
- There are no new metrics or tracing endpoints in this change.

### D9. Backup, restore, and upgrades

- Backup: stop the container, archive `/data`, then start it again. Stopping avoids copying an active PGlite data directory.
- Restore: create a new volume, extract the archive, start the container with that volume.
- Upgrade: stop, back up, replace the image, start. Migrations run before traffic. Roll back by starting the previous image only if the migrations are backward-compatible; otherwise restore the backup.
- PGlite is pinned by the lockfile. Test restores when upgrading PGlite, since the embedded data format can change between versions.
- There is no point-in-time recovery and no automatic backup job.

## Risks / Trade-offs

- **PGlite concurrency** → Raise `maxConnections`, keep the web and collab pools at 10 each, and document that this is not a high-concurrency database.
- **Single point of failure** → `restart: unless-stopped` and fail-fast supervision. No HA.
- **No PITR** → Stopped-volume backups and a documented restore drill. Larger deployments should use the existing PostgreSQL path.
- **Large first image** → Accepted for v1; slim image is a follow-up.
- **Proxy is a new critical path** → Test HTTP routing, WebSocket upgrades, large asset uploads, `X-Forwarded-For`, and graceful shutdown. Only publish the proxy port.
- **Relative WebSocket URL browser support** → Modern browsers support it (Chrome 125+, Firefox 124+, Safari 17.3+). If older browsers matter, derive an absolute same-origin URL from `window.location` instead.
- **CSP with a relative collab path** → Omit the relative value from `connect-src` and retain `'self' ws: wss:`; verify no console CSP violations over HTTP and HTTPS. `'self'` alone is not sufficient for WebSocket schemes in all browsers.
- **Bind-mount permissions** → Named volumes inherit image ownership. Bind mounts need the host directory owned by the container user (`1000:1000` by default).
- **Existing data cannot be imported** → This mode starts with a fresh PGlite database. Migrating from external PostgreSQL is out of scope.
- **Rate limits are process-local** → Acceptable because the web tier is one container; scaling would require the existing multi-service path.
- **Migration failure on upgrade** → Container exits before serving. Keep a backup and test upgrades.

## Migration Plan

1. Add the new Dockerfile, entrypoint, PGlite server, proxy, Compose example, and documentation. Do not change the existing images or Compose topology.
2. Fix shared `.dockerignore` entries so `.env*` is never in any image.
3. Build the image and start it against an empty named volume.
4. Verify first-run migrations, deck creation, two-browser collaboration, image upload, and export.
5. Restart the container and verify the deck and image persist.
6. Stop the container, archive `/data`, restore into a new volume, and verify the same deck and image.
7. Document that switching from the two-image deployment requires a separate data migration, which this change does not provide.

Rollback for this new path is simply running the previous image with a compatible volume or restoring the backup. The existing two-image deployment is unaffected.
