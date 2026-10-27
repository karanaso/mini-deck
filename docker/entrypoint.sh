#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export NODE_ENV="${NODE_ENV:-production}"
export NEXT_TELEMETRY_DISABLED="${NEXT_TELEMETRY_DISABLED:-1}"
export PGLITE_PORT="${PGLITE_PORT:-5433}"
export PGLITE_DATA_DIR="${PGLITE_DATA_DIR:-/data/pglite}"
export DATABASE_URL="${DATABASE_URL:-postgres://postgres:postgres@127.0.0.1:${PGLITE_PORT}/minideck}"
export STORAGE_DRIVER="${STORAGE_DRIVER:-local}"
export STORAGE_DIR="${STORAGE_DIR:-/data/assets}"
export COLLAB_HOST="${COLLAB_HOST:-127.0.0.1}"
export COLLAB_PORT="${COLLAB_PORT:-1234}"
export WEB_PORT="${WEB_PORT:-3000}"
export PROXY_PORT="${PROXY_PORT:-8080}"
export NEXT_PUBLIC_COLLAB_WS_URL="${NEXT_PUBLIC_COLLAB_WS_URL:-/collab}"
export PUBLIC_APP_URL="${PUBLIC_APP_URL:-http://localhost:${PROXY_PORT}}"

mkdir -p "$PGLITE_DATA_DIR" "$STORAGE_DIR"

pglite_pid=""
app_pid=""

cleanup() {
  trap - EXIT TERM INT
  if [ -n "$app_pid" ] && kill -0 "$app_pid" 2>/dev/null; then
    kill -TERM "$app_pid" 2>/dev/null || true
  fi
  if [ -n "$pglite_pid" ] && kill -0 "$pglite_pid" 2>/dev/null; then
    kill -TERM "$pglite_pid" 2>/dev/null || true
  fi
  if [ -n "$app_pid" ]; then
    wait "$app_pid" 2>/dev/null || true
  fi
  if [ -n "$pglite_pid" ]; then
    wait "$pglite_pid" 2>/dev/null || true
  fi
}

trap cleanup EXIT
trap 'exit 0' TERM INT

wait_for_port() {
  local port="$1"
  local pid="${2:-}"
  local attempt
  for attempt in $(seq 1 300); do
    if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then
      return 1
    fi
    if node -e '
      const net = require("node:net");
      const socket = net.connect(Number(process.argv[1]), "127.0.0.1");
      socket.once("connect", () => { socket.destroy(); process.exit(0); });
      socket.once("error", () => { socket.destroy(); process.exit(1); });
    ' "$port" 2>/dev/null; then
      return 0
    fi
    sleep 0.2
  done
  return 1
}

echo "[entrypoint] starting PGlite on 127.0.0.1:${PGLITE_PORT}"
node "$ROOT/docker/pglite-server.mjs" &
pglite_pid=$!

if ! wait_for_port "$PGLITE_PORT" "$pglite_pid"; then
  if kill -0 "$pglite_pid" 2>/dev/null; then
    echo "[entrypoint] PGlite did not become ready" >&2
  else
    echo "[entrypoint] PGlite exited during startup" >&2
  fi
  exit 1
fi

echo "[entrypoint] applying migrations"
pnpm --filter @mini-deck/db db:migrate

echo "[entrypoint] starting web, collab, and proxy"
pnpm exec concurrently -k -n web,collab,proxy \
  "pnpm --filter @mini-deck/web exec next start --port ${WEB_PORT} -H 127.0.0.1" \
  "node ${ROOT}/apps/collab/dist/index.js" \
  "node ${ROOT}/docker/proxy.mjs" &
app_pid=$!

set +e
wait -n "$pglite_pid" "$app_pid"
status=$?
set -e

if kill -0 "$pglite_pid" 2>/dev/null; then
  echo "[entrypoint] application processes exited; stopping PGlite" >&2
else
  echo "[entrypoint] PGlite exited; stopping application processes" >&2
fi

exit "$status"
