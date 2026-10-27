#!/usr/bin/env bash
#
# Build the single-container Mini Deck image locally and copy it to the server.
#
# Usage:
#   ./scripts/ship-image.sh
#
# Overrides:
#   IMAGE=mini-deck:local
#   REMOTE_USER=root
#   REMOTE_HOST=server004.sekdev.com
#   REMOTE_PORT=22
#   REMOTE_DIR=/DataDisk
#   PLATFORM=linux/amd64    # set linux/arm64 for an ARM server; empty = host platform
#   ARCHIVE=/path/file.tgz  # local image archive (defaults to dist/)
#   PULL=1                  # pass --pull to docker build
#   SKIP_BUILD=1            # upload the existing local image instead of rebuilding
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

IMAGE="${IMAGE:-mini-deck:local}"
REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_HOST="${REMOTE_HOST:-server004.sekdev.com}"
REMOTE_PORT="${REMOTE_PORT:-22}"
REMOTE_DIR="${REMOTE_DIR:-/DataDisk}"
PLATFORM="${PLATFORM-linux/amd64}"
ARCHIVE="${ARCHIVE:-$ROOT/dist/mini-deck-local.tar.gz}"

REMOTE="${REMOTE_USER}@${REMOTE_HOST}"

log() { printf '\n==> %s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

for tool in docker ssh scp gzip; do
  command -v "$tool" >/dev/null 2>&1 || die "$tool is required"
done

if [[ "${SKIP_BUILD:-0}" == "1" ]]; then
  docker image inspect "$IMAGE" >/dev/null 2>&1 || die "image $IMAGE does not exist"
  log "Using existing image $IMAGE"
else
  build_args=(--tag "$IMAGE" --file "$ROOT/Dockerfile")
  if [[ -n "$PLATFORM" ]]; then
    build_args+=(--platform "$PLATFORM")
  fi
  if [[ "${PULL:-0}" == "1" ]]; then
    build_args+=(--pull)
  fi

  log "Building $IMAGE${PLATFORM:+ for $PLATFORM}"
  docker build "${build_args[@]}" "$ROOT"
fi

mkdir -p "$(dirname "$ARCHIVE")"
tmp_archive="${ARCHIVE}.partial"
rm -f "$tmp_archive"
trap 'rm -f "$tmp_archive"' EXIT

if command -v pigz >/dev/null 2>&1; then
  compressor=(pigz -1)
else
  compressor=(gzip -1)
fi

log "Saving $IMAGE to $ARCHIVE"
docker save "$IMAGE" | "${compressor[@]}" > "$tmp_archive"
mv "$tmp_archive" "$ARCHIVE"
trap - EXIT

log "Archive ready ($(du -h "$ARCHIVE" | cut -f1)): $ARCHIVE"

log "Copying to ${REMOTE}:${REMOTE_DIR}/ on port ${REMOTE_PORT}"
scp -P "$REMOTE_PORT" "$ARCHIVE" "${REMOTE}:${REMOTE_DIR}/"

log "Upload complete"
cat <<EOF

On the server, load and run it with:
  ssh -p ${REMOTE_PORT} ${REMOTE}
  docker load < ${REMOTE_DIR}/$(basename "$ARCHIVE")
  docker run -d --name mini-deck -p 8080:8080 -v mini-deck-data:/data --restart unless-stopped ${IMAGE}
EOF
