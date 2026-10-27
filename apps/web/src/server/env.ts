import { resolve } from "node:path";
import { z } from "zod";

const defaultStorageDir = process.cwd().endsWith("apps/web")
  ? resolve(process.cwd(), "../../.data/assets")
  : resolve(process.cwd(), ".data/assets");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z
    .string()
    .default("postgres://postgres:postgres@127.0.0.1:5433/minideck"),
  PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  NEXT_PUBLIC_COLLAB_WS_URL: z.string().default("ws://localhost:1234"),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_DIR: z.string().default(defaultStorageDir),
  S3_ENDPOINT: z.string().default("http://localhost:9000"),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().default("minideck"),
  S3_ACCESS_KEY_ID: z.string().default("minioadmin"),
  S3_SECRET_ACCESS_KEY: z.string().default("minioadmin"),
  S3_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  DECK_CREATE_RATE_LIMIT: z.coerce.number().int().min(1).default(100),
  AUTH_FAILURE_RATE_LIMIT: z.coerce.number().int().min(1).default(60),
  MAX_IMAGE_BYTES: z.coerce.number().int().min(1).default(10 * 1024 * 1024),
});

export type ServerEnv = z.infer<typeof envSchema>;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (!cached) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        `Invalid server environment: ${parsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ")}`,
      );
    }
    cached = parsed.data;
  }
  return cached;
}

export function resetServerEnvForTests(): void {
  cached = null;
}
