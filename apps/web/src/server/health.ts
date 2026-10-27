import { sql } from "drizzle-orm";

import { getDatabase } from "@mini-deck/db";

export async function checkDatabaseHealth(
  database = getDatabase().db,
): Promise<boolean> {
  try {
    await database.execute(sql`select 1`);
    return true;
  } catch (error) {
    console.error(
      "Database health check failed:",
      error instanceof Error ? error.message : "unknown database error",
      error instanceof Error && "cause" in error ? String(error.cause) : "",
    );
    return false;
  }
}
