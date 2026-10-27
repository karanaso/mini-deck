# Deployment runbook

Mini Deck runs as two long-lived Node services plus PostgreSQL and S3-compatible object storage.

For a small self-hosted instance, `docs/single-container.md` describes a single-container mode with embedded PGlite and local asset storage. That mode is separate from this deployment and does not import data from this PostgreSQL setup.

## Topology

```text
browser ──HTTP──> web (Next.js, port 3000)
   │                  │
   └──WebSocket──> collab (Hocuspocus, port 1234)
                      │
        both ─────────┴──> PostgreSQL
 web ────────────────────> S3 bucket (images)
```

The collaboration service must be a single long-lived instance in v1. Do not deploy it to a serverless platform. If you need multiple instances, add the Hocuspocus Redis extension and sticky routing.

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `PUBLIC_APP_URL` | yes | Public browser origin, e.g. `https://decks.example.com` |
| `NEXT_PUBLIC_COLLAB_WS_URL` | yes at build | Public WebSocket URL, e.g. `wss://collab.example.com` |
| `COLLAB_PORT` | no | Default 1234; the container must expose the WebSocket port |
| `COLLAB_DEBOUNCE_MS` / `COLLAB_MAX_DEBOUNCE_MS` | no | Persistence timing; defaults 2000/10000 |
| `STORAGE_DRIVER` | no | `s3` in production; `local` only for development |
| `S3_ENDPOINT` | for S3 | e.g. `https://s3.us-east-1.amazonaws.com` |
| `S3_REGION` | for S3 | Default `us-east-1` |
| `S3_BUCKET` | for S3 | Bucket name |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | for S3 | Use workload identity/secret manager where possible |
| `S3_FORCE_PATH_STYLE` | no | `true` for MinIO, usually `false` for AWS |
| `DECK_CREATE_RATE_LIMIT` | no | Per-IP creations/minute |
| `AUTH_FAILURE_RATE_LIMIT` | no | Per-IP failed token attempts/minute |

Because `NEXT_PUBLIC_COLLAB_WS_URL` is embedded in the browser bundle, rebuild the web image when it changes. The web proxy CSP also reads it at runtime, so keep the runtime value aligned.

## Database

Apply migrations before starting a new web version:

```bash
pnpm db:migrate
```

Migrations are additive for the v1 schema. Never drop or rewrite a live token hash column without a paired migration and rollback plan.

## Object storage

Private bucket, no public policy. Create it with:

```bash
pnpm storage:ensure
```

The app streams images through `/api/assets/{assetId}`. For a CDN, place it in front of that route; asset responses are immutable and content-addressed by random ID.

## Docker Compose example

```bash
export PUBLIC_APP_URL=https://decks.example.com
export NEXT_PUBLIC_COLLAB_WS_URL=wss://collab.example.com
docker compose -f docker-compose.prod.yml config
docker compose -f docker-compose.prod.yml up -d --build
```

The web container runs migrations before `next start`. The compose file includes PostgreSQL, MinIO, a bucket-init job, the collaboration service, and the web service. Put a TLS-terminating reverse proxy in front of both ports and forward WebSocket upgrades to the collaboration service.

If you use the compose file as-is, set strong `POSTGRES_PASSWORD`, `MINIO_ROOT_USER`, and `MINIO_ROOT_PASSWORD` values. Do not expose MinIO's console publicly.

## Reverse proxy notes

- Forward `/api/*` and page requests to web.
- Forward WebSocket upgrades to collab, preserving `Upgrade` and `Connection` headers.
- Set a request body limit at least equal to the 10 MB image upload limit.
- Do not enable response buffering for WebSockets.
- Preserve `X-Forwarded-For` only from trusted proxies; rate limiting uses the first address.
- Add HSTS at the proxy.

## Health checks

- Web: `GET /api/health` → 200 when PostgreSQL is reachable, 503 otherwise.
- Collab: `GET /health` → 200 when PostgreSQL is reachable, 503 otherwise.
- Both containers define Docker health checks.

## Backups and recovery

- Enable PostgreSQL point-in-time recovery. The `decks`, `deck_documents`, and `deck_assets` tables are the full metadata.
- Enable object-storage versioning or lifecycle backups for the image bucket.
- Restore order: PostgreSQL first, then the bucket. Asset rows point to object keys; missing objects render placeholders but do not break deck text.
- Test a restore into a staging database and verify a deck opens, its title matches, and images load.

## Rollout and rollback

1. Apply additive migrations.
2. Deploy the collaboration service. `SIGTERM` flushes pending stores and disconnects clients, which reconnect.
3. Deploy the web service.
4. Verify `/api/health`, `/health`, create a deck, edit it in two browsers, upload an image, and export a PDF.

Rollback is an image redeploy. Keep the database schema backward-compatible; avoid destructive changes in the same release. If a release changes the Yjs `schemaVersion`, add a migration and keep old clients from writing incompatible data.

## Observability

- Structured logs for auth accepts/rejects, disconnects, store failures, upload failures, and export errors.
- Never log tokens or full deck content.
- Alerts: 5xx rate, collab health failures, persistence retry loops, WebSocket connection drops, database latency, storage 5xx.
- No third-party analytics on deck pages; the edit token lives in the fragment.

## Known operational limits

- One collab instance; process-local rate limits and awareness.
- No link revocation or owner account.
- No automatic deletion of abandoned assets; add a lifecycle job with a grace period.
- PDF export runs in the browser; very large decks depend on the participant's memory. The performance baseline is in `docs/performance.md`.
