#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

mkdir -p .data
DB_URL="${DATABASE_URL:-postgres://postgres:postgres@127.0.0.1:5433/minideck}"
DB_PORT="$(DB_URL="$DB_URL" node -e 'process.stdout.write(new URL(process.env.DB_URL).port || "5432")')"
STARTED_DB=0
cleanup() {
  if [ "$STARTED_DB" = "1" ]; then
    local pid
    pid="$(lsof -t -i:"$DB_PORT" 2>/dev/null | head -n 1 || true)"
    if [ -n "$pid" ]; then kill "$pid" >/dev/null 2>&1 || true; fi
  fi
}
if ! nc -z 127.0.0.1 "$DB_PORT" >/dev/null 2>&1; then
  echo "Starting local PGlite server on port ${DB_PORT}..."
  PGLITE_PORT="$DB_PORT" pnpm db:start > .data/pglite.log 2>&1 &
  STARTED_DB=1
  trap cleanup EXIT
  for _ in $(seq 1 100); do
    if nc -z 127.0.0.1 "$DB_PORT" >/dev/null 2>&1; then break; fi
    sleep 0.2
  done
fi

if ! nc -z 127.0.0.1 "$DB_PORT" >/dev/null 2>&1; then
  echo "PGlite failed to start. See .data/pglite.log" >&2
  exit 1
fi

pnpm db:migrate
eval "$@"
