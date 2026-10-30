#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Next.js only reads .env from its own package directory. The project keeps a
# single .env at the repository root, so load it here for both dev processes.
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

# Start PGlite if needed and apply migrations. Leaves the database running.
bash scripts/db-migrate.sh

WEB_PORT="${WEB_PORT:-3000}"
if nc -z 127.0.0.1 "$WEB_PORT" >/dev/null 2>&1; then
  WEB_PORT=3100
fi
if nc -z 127.0.0.1 "$WEB_PORT" >/dev/null 2>&1; then
  echo "Ports 3000 and 3100 are both in use. Set WEB_PORT to a free port." >&2
  exit 1
fi

echo
echo "Mini Deck:"
echo "  Web:   http://localhost:${WEB_PORT}"
echo "  Collab: ws://localhost:1234"
echo "  Stop the database with: pnpm db:stop"
echo

pnpm build:packages
exec pnpm exec concurrently -k -n web,collab -c blue,green \
  "pnpm --filter @mini-deck/web exec next dev --port ${WEB_PORT}" \
  "pnpm --filter @mini-deck/collab dev"
