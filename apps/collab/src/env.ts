import "dotenv/config";
import { resolve } from "node:path";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z
    .string()
    .url()
    .default("postgres://postgres:postgres@127.0.0.1:5433/minideck"),
  COLLAB_PORT: z.coerce.number().int().min(0).max(65535).default(1234),
  COLLAB_HOST: z.string().default("0.0.0.0"),
  COLLAB_DEBOUNCE_MS: z.coerce.number().int().min(0).default(2000),
  COLLAB_MAX_DEBOUNCE_MS: z.coerce.number().int().min(0).default(10_000),
  COLLAB_MAX_PAYLOAD_BYTES: z.coerce.number().int().min(1024).default(5 * 1024 * 1024),
  COLLAB_MAX_DOCUMENTS_PER_CONNECTION: z.coerce.number().int().min(1).default(10),
  DECK_SESSION_SECRET: z.string().trim().default(""),
  PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_DIR: z.string().default(resolve(process.cwd(), ".data/assets")),
});

export type CollabEnv = z.infer<typeof envSchema>;

let cached: CollabEnv | null = null;

export function getCollabEnv(): CollabEnv {
  if (!cached) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        `Invalid collaboration environment: ${parsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ")}`,
      );
    }
    cached = parsed.data;
  }
  return cached;
}
