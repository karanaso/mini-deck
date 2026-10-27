import { resolve } from "node:path";

process.env.DATABASE_URL ??= "postgres://postgres:postgres@127.0.0.1:5433/minideck";
process.env.STORAGE_DRIVER ??= "local";
process.env.STORAGE_DIR ??= resolve(process.cwd(), ".data/test-assets");
process.env.PUBLIC_APP_URL ??= "http://localhost:3000";
process.env.NEXT_PUBLIC_COLLAB_WS_URL ??= "ws://localhost:1234";
process.env.COLLAB_DEBOUNCE_MS ??= "100";
process.env.COLLAB_PORT ??= "0";
process.env.DECK_CREATE_RATE_LIMIT ??= "1000";
process.env.AUTH_FAILURE_RATE_LIMIT ??= "1000";
