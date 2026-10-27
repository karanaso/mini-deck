import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema.js";

export const DEFAULT_DATABASE_URL =
  "postgres://postgres:postgres@127.0.0.1:5433/minideck";

export function createDatabase(url = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL) {
  const client = postgres(url, {
    max: 10,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 5,
  });
  const db = drizzle(client, { schema });
  return { db, client };
}

export type Database = ReturnType<typeof createDatabase>["db"];
export type DatabaseClient = ReturnType<typeof createDatabase>["client"];

interface DatabaseGlobal {
  __miniDeckDatabase?: ReturnType<typeof createDatabase>;
}

const globalForDatabase = globalThis as unknown as DatabaseGlobal;

export function getDatabase(): ReturnType<typeof createDatabase> {
  if (!globalForDatabase.__miniDeckDatabase) {
    globalForDatabase.__miniDeckDatabase = createDatabase();
  }
  return globalForDatabase.__miniDeckDatabase;
}

export async function closeDatabase(): Promise<void> {
  if (globalForDatabase.__miniDeckDatabase) {
    await globalForDatabase.__miniDeckDatabase.client.end({ timeout: 5 });
    globalForDatabase.__miniDeckDatabase = undefined;
  }
}

export { schema };
