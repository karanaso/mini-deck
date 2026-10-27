#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PID="$(lsof -t -i:5433 2>/dev/null | head -n 1 || true)"
if [ -z "$PID" ]; then
  echo "No local database is running on port 5433."
  exit 0
fi

kill -TERM "$PID" >/dev/null 2>&1 || true
for _ in $(seq 1 50); do
  if ! kill -0 "$PID" >/dev/null 2>&1; then break; fi
  sleep 0.1
done
echo "Local database stopped."
