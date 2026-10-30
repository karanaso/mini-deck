# Single-container deployment

This guide runs Mini Deck as one self-contained container for a small self-hosted instance. It embeds PGlite for the database, uses the local filesystem for uploaded assets, and serves both the web app and the collaboration WebSocket through one HTTP port.

TLS is expected at an external reverse proxy. The container speaks plain HTTP on port `8080`.

For the two-image production topology with managed PostgreSQL and object storage, see `docs/deployment.md`.

## Quickstart

```bash
docker compose -f compose.single.yml up -d --build --wait
curl -fsS http://localhost:8080/api/health
```

Open <http://localhost:8080>.

The Compose file builds `mini-deck:local`, publishes only port `8080`, and stores all state in the named volume `mini-deck-data`.

To run without Compose:

```bash
docker build -t mini-deck:local .
docker run -d \
  --name mini-deck \
  -p 8080:8080 \
  -v mini-deck-data:/data \
  --restart unless-stopped \
  mini-deck:local
```

The container starts PGlite, waits for it, applies migrations, then starts the web app, collaboration server, and internal proxy. Startup logs show each phase in order:

```bash
docker logs -f mini-deck
```

## What the container runs

```text
browser
  |
  | HTTP / WebSocket :8080
  v
+------------------------------------------------------------------+
| mini-deck container                                              |
|                                                                  |
|  proxy :8080                                                     |
|    |-- /          --> web :3000                                  |
|    `-- /collab    --> collab :1234                               |
|                                                                  |
|  PGlite :5433                                                    |
|  /data/pglite and /data/assets                                   |
+------------------------------------------------------------------+
```

Only `8080` is published. The web, collaboration, and database ports bind to loopback inside the container.

## Configuration

The image has working defaults. Most installations only need to choose a host port or put a TLS proxy in front of `8080`.

| Variable | Default | Notes |
| --- | --- | --- |
| `PGLITE_PORT` | `5433` | Internal database port; do not publish it |
| `PGLITE_DATA_DIR` | `/data/pglite` | Must stay under `/data` for persistence |
| `DATABASE_URL` | `postgres://postgres:postgres@127.0.0.1:5433/minideck` | Internal; the placeholder credentials are not used for authentication |
| `STORAGE_DRIVER` | `local` | Keep `local` for this mode |
| `STORAGE_DIR` | `/data/assets` | Must stay under `/data` for persistence |
| `COLLAB_HOST` / `COLLAB_PORT` | `127.0.0.1` / `1234` | Internal collaboration server |
| `WEB_PORT` | `3000` | Internal Next.js server |
| `PROXY_PORT` | `8080` | The one published port |
| `NEXT_PUBLIC_COLLAB_WS_URL` | `/collab` | Build-time and runtime value; leave it alone |
| `PUBLIC_APP_URL` | `http://localhost:8080` | Optional; currently unused by runtime code |
| `COLLAB_DEBOUNCE_MS` / `COLLAB_MAX_DEBOUNCE_MS` | `2000` / `10000` | Document persistence timing |
| `DECK_CREATE_RATE_LIMIT` / `AUTH_FAILURE_RATE_LIMIT` | `100` / `60` | Per-IP requests per minute |
| `IMAGE_SEARCH_RATE_LIMIT` / `IMAGE_IMPORT_RATE_LIMIT` | `60` / `30` | Per-IP stock image searches and imports per minute |
| `UNSPLASH_ACCESS_KEY` / `PEXELS_API_KEY` | unset | Optional stock image providers; keep keys server-side |
| `DECK_SESSION_SECRET` | unset | Required in production for PIN access; 32+ characters shared with the web process |

Stock image search is optional in this mode. Add the provider keys to the container environment and restart to enable search. Imported photos are stored under `STORAGE_DIR` like uploaded images, so no extra volume or migration is required.

Do not set `DATABASE_URL` to an external PostgreSQL server for this mode. The single-container image expects its embedded database.

## External TLS proxy

Put a TLS-terminating proxy in front of the published port and forward all paths, including WebSocket upgrades, to `127.0.0.1:8080`.

Caddy is the smallest configuration:

```caddyfile
decks.example.com {
    reverse_proxy 127.0.0.1:8080
}
```

Caddy handles HTTPS and WebSocket upgrades automatically. The browser then uses `wss://decks.example.com/collab` without rebuilding the image.

An nginx example:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 443 ssl;
    server_name decks.example.com;

    client_max_body_size 12m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
    }
}
```

Keep the request body limit above the 10 MB image upload cap. Do not buffer WebSocket responses.

## Data and permissions

Two paths are durable:

- `/data/pglite` — the embedded database.
- `/data/assets` — uploaded images.

The named volume `mini-deck-data` is owned by the container user (`1000:1000`). If you use a bind mount instead, prepare it first:

```bash
sudo install -d -o 1000 -g 1000 /srv/mini-deck
docker run -d --name mini-deck -p 8080:8080 -v /srv/mini-deck:/data mini-deck:local
```

## Backup

Stop the container first so the PGlite data directory is quiescent, then archive the volume. These commands assume the Compose quickstart; if you used `docker run`, use `docker stop mini-deck` and `docker start mini-deck` instead of the Compose commands. On Docker Desktop, the backup directory must be a path shared with Docker (for example, inside the project directory), or the bind mount is denied.

```bash
mkdir -p "$HOME/mini-deck-backups"
docker compose -f compose.single.yml stop
docker run --rm \
  -v mini-deck-data:/data \
  -v "$HOME/mini-deck-backups":/backup \
  alpine tar czf "/backup/mini-deck-$(date +%F-%H%M%S).tgz" -C /data .
docker compose -f compose.single.yml start
```

Verify the container is healthy again:

```bash
docker compose -f compose.single.yml ps
curl -fsS http://localhost:8080/api/health
```

## Restore

Restore into a new volume so the original backup remains untouched. Stop the running service first.

```bash
docker compose -f compose.single.yml down
docker volume create mini-deck-data-restored
docker run --rm \
  -v mini-deck-data-restored:/data \
  -v "$HOME/mini-deck-backups":/backup \
  alpine sh -c 'tar xzf /backup/mini-deck-YYYY-MM-DD-HHMMSS.tgz -C /data && chown -R 1000:1000 /data'
```

Start a container with the restored volume, using a different host port if the original is still running:

```bash
docker run -d \
  --name mini-deck-restored \
  -p 8081:8080 \
  -v mini-deck-data-restored:/data \
  mini-deck:local
```

Open a saved deck link and verify the deck and its images are present. The backup contains the database and the asset files, so both should restore together.

## Upgrades and rollback

```bash
docker compose -f compose.single.yml stop
# back up the volume first
docker compose -f compose.single.yml build --pull
docker compose -f compose.single.yml up -d --wait
```

Migrations run before the web or collaboration service accepts traffic. If a migration fails, the container exits without serving the app; the logs show the failure.

Rollback is an image redeploy, but only if the migrations are backward-compatible. Otherwise restore the pre-upgrade volume archive. PGlite is pinned by the lockfile; test restores when upgrading PGlite itself.

This mode does not import data from the existing PostgreSQL deployment. Switching from the two-image stack requires a separate data migration; this change does not provide one.

## Limits

- PGlite is a single-process, WASM PostgreSQL build with a connection multiplexer. The socket server allows 50 connections; the web and collaboration pools use 10 each. This is not a high-concurrency database.
- There is no point-in-time recovery, replication, or automatic backup job. Backups are stopped-volume archives.
- The collaboration server is a single long-lived instance. There is no horizontal scaling or Redis fan-out.
- The image includes the workspace and development dependencies to keep the first packaging iteration simple. It is larger than a production-only image.
- Rate limits and presence state are process-local, which is acceptable for one web container.
- TLS, HSTS, and certificate management belong to the external proxy.

## Runtime verification

These commands match the checks used for the image:

```bash
# No development environment file is in the image
docker run --rm --entrypoint sh mini-deck:local -c \
  '! test -e /app/.env && ! test -e /app/.env.local && echo clean'

# Non-root runtime user
docker run --rm --entrypoint id mini-deck:local -u   # 1000

# /data is writable by the runtime user
docker run --rm --entrypoint sh mini-deck:local -c \
  'touch /data/probe && rm /data/probe && echo writable'

# Only 8080 is published
docker port mini-deck

# Internal ports bind to loopback; 8080 listens on all interfaces
docker exec mini-deck cat /proc/net/tcp | grep -E ':(0BB8|04D2|1539|1F90) ' || true
```

The web bundle uses a relative `/collab` WebSocket path and contains no `localhost:1234` fallback:

```bash
docker run --rm --entrypoint sh mini-deck:local -c \
  'grep -R "localhost:1234" apps/web/.next/static || echo clean; grep -R "/collab" apps/web/.next/static | head'
```

Fail-fast supervision can be checked by stopping the web process; the container should exit and be marked unhealthy:

```bash
docker exec mini-deck pkill -f next-server
docker inspect mini-deck --format '{{.State.Status}} {{.State.ExitCode}}'
```

For a local TLS check without a public domain, run Caddy on a Docker network with the container and publish `8443`:

```bash
docker network create mini-deck-https
docker network connect mini-deck-https mini-deck
docker run -d --name mini-deck-caddy \
  --network mini-deck-https \
  -p 8443:8443 \
  -v "$PWD/docker/test/Caddyfile:/etc/caddy/Caddyfile:ro" \
  -v mini-deck-caddy-data:/data \
  caddy:2-alpine
```

The test Caddyfile proxies `https://localhost:8443` to `mini-deck:8080`; set `UPSTREAM` to your container name if it differs. Use a browser that accepts the local certificate for the check.

## Troubleshooting

- **Health is `starting`** — give PGlite, migrations, and Next.js time to start; the health check allows a 60-second start period.
- **Health is `unhealthy`** — check `docker logs`. Common causes are a failed migration, a volume permission error, or an occupied port.
- **WebSocket stays offline** — confirm the external proxy forwards `/collab` upgrades to `8080`. Do not route `/collab` to a separate port; the container has one published port.
- **`EACCES` under `/data`** — a bind mount is not owned by UID/GID `1000`. Fix ownership or use the named volume.
- **Container restarts repeatedly** — inspect the logs for a migration failure or a PGlite data-directory problem. Restore the last backup if the data directory is damaged.
- **Existing deck links do not open** — this mode starts with a fresh PGlite database. It cannot see decks from the two-image PostgreSQL deployment without a data migration.
