# Proposal

## Why

Mini Deck currently needs Node.js, PostgreSQL, MinIO, and two long-lived application processes to run. That is reasonable for production, but it is more setup than a small self-hosted instance should require. A single all-in-one container gives one image, one volume, and one HTTP endpoint while preserving the existing two-image path for larger deployments.

## What Changes

- Add a single container image that runs the web app, collaboration server, PGlite database, local asset storage, and an internal HTTP/WebSocket proxy.
- Expose one HTTP port. Serve the app at `/` and the collaboration WebSocket at `/collab`; TLS terminates at an external reverse proxy.
- Persist all state under `/data`: the PGlite data directory and uploaded assets.
- Start PGlite, wait for readiness, apply migrations, then start the application processes. Stop the whole container if any managed process exits, and flush pending collaboration updates on graceful shutdown.
- Add a one-service Compose example and document first run, upgrades, backups, and restore.
- Exclude development `.env` files from the build context and use explicit runtime environment values.
- Keep the existing `apps/web/Dockerfile`, `apps/collab/Dockerfile`, and `docker-compose.prod.yml` as the path for managed PostgreSQL and object storage. This change is additive, not a replacement.

## Capabilities

### New Capabilities

- `container-deployment`: Packaging and runtime behavior for a single self-contained Mini Deck container, including one-port routing, embedded persistence, startup migrations, health, shutdown, and backup expectations.

### Modified Capabilities

None. Application behavior, HTTP APIs, and the Yjs document format do not change.

## Impact

- **New files**: a single-container Dockerfile, container entrypoint and supervisor scripts, an internal proxy, a one-service Compose file, and deployment documentation.
- **Runtime dependencies**: PGlite socket server, local filesystem asset storage, and a small HTTP/WebSocket proxy.
- **Configuration**: build-time `NEXT_PUBLIC_COLLAB_WS_URL=/collab`; internal `DATABASE_URL` pointing at PGlite; `STORAGE_DRIVER=local` and `STORAGE_DIR=/data/assets`.
- **Operations**: one published port and one named volume; startup migrations; volume-archive backup while the container is stopped. No point-in-time recovery or horizontal scaling in this mode.
- **Data migration**: this mode starts with a fresh PGlite database; importing data from the existing PostgreSQL deployment is out of scope.
- **Unchanged**: the existing two-image production topology, application schema, and API contracts.
