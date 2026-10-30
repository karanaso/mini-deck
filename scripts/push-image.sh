#!/usr/bin/env bash
#
# Build the single-container Mini Deck image and push it to Docker Hub.
#
# Usage:
#   ./scripts/push-image.sh
#
# Overrides:
#   IMAGE=karanaso/mini-deck
#   TAG=latest
#   PLATFORM=linux/amd64    # set linux/arm64 for an ARM host; empty = host platform
#   PULL=1                  # pass --pull to docker build
#   SKIP_BUILD=1            # push the existing local image instead of rebuilding
#   SKIP_PUSH=1             # build only, do not push
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

IMAGE="${IMAGE:-karanaso/mini-deck}"
TAG="${TAG:-latest}"
PLATFORM="${PLATFORM-linux/amd64}"
REF="${IMAGE}:${TAG}"

log() { printf '\n==> %s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || die "docker is required"

if [[ "${SKIP_BUILD:-0}" == "1" ]]; then
  docker image inspect "$REF" >/dev/null 2>&1 || die "image $REF does not exist"
  log "Using existing image $REF"
else
  build_args=(--tag "$REF" --file "$ROOT/Dockerfile")

  if [[ -n "$PLATFORM" ]]; then
    build_args+=(--platform "$PLATFORM")
  fi

  if [[ "${PULL:-0}" == "1" ]]; then
    build_args+=(--pull)
  fi

  log "Building $REF${PLATFORM:+ for $PLATFORM}"
  docker build "${build_args[@]}" "$ROOT"
fi

if [[ "${SKIP_PUSH:-0}" == "1" ]]; then
  log "Skipping push (SKIP_PUSH=1); image $REF is available locally"
  exit 0
fi

log "Pushing $REF"
if ! docker push "$REF"; then
  printf '\n' >&2
  die "docker push failed. Log in to Docker Hub first: docker login"
fi

log "Pushed $REF"
