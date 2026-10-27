# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS base
RUN npm install -g pnpm@11.17.0 && npm cache clean --force
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/collab/package.json apps/collab/package.json
COPY packages/deck/package.json packages/deck/package.json
COPY packages/db/package.json packages/db/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
ARG NEXT_PUBLIC_COLLAB_WS_URL=/collab
ENV NEXT_PUBLIC_COLLAB_WS_URL=$NEXT_PUBLIC_COLLAB_WS_URL
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PGLITE_PORT=5433
ENV PGLITE_DATA_DIR=/data/pglite
ENV STORAGE_DRIVER=local
ENV STORAGE_DIR=/data/assets
ENV COLLAB_HOST=127.0.0.1
ENV COLLAB_PORT=1234
ENV WEB_PORT=3000
ENV PROXY_PORT=8080
ENV NEXT_PUBLIC_COLLAB_WS_URL=/collab

RUN apt-get update \
  && apt-get install -y --no-install-recommends tini procps \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app ./

RUN mkdir -p /data/pglite /data/assets \
  && chown -R node:node /data /app/apps/web/.next \
  && chmod +x /app/docker/entrypoint.sh

EXPOSE 8080
VOLUME ["/data"]

HEALTHCHECK --interval=15s --timeout=3s --start-period=60s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:8080/api/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

USER node
ENTRYPOINT ["/usr/bin/tini", "--", "/app/docker/entrypoint.sh"]
