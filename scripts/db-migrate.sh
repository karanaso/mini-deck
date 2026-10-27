#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
mkdir -p .data

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

DB_URL="${DATABASE_URL:-postgres://postgres:postgres@127.0.0.1:5433/minideck}"
IS_LOCAL=0
case "$DB_URL" in
  *"127.0.0.1:5433"*|*"localhost:5433"*) IS_LOCAL=1 ;;
esac

if [ "$IS_LOCAL" = "1" ] && ! nc -z 127.0.0.1 5433 >/dev/null 2>&1; then
  echo "Local database is not running. Starting PGlite on 127.0.0.1:5433..."
  nohup env PGLITE_PORT=5433 pnpm db:start > .data/pglite.log 2>&1 &
  for _ in $(seq 1 150); do
    if nc -z 127.0.0.1 5433 >/dev/null 2>&1; then break; fi
    sleep 0.2
  done
  if ! nc -z 127.0.0.1 5433 >/dev/null 2>&1; then
    echo "Could not start PGlite. See .data/pglite.log:" >&2
    tail -20 .data/pglite.log >&2 || true
    exit 1
  fi
  echo "Local database started. Stop it later with: pnpm db:stop"
fi

pnpm --filter @mini-deck/db db:migrate
