import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { getServerEnv } from "./env";

export interface AssetStorage {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array>;
  ensureReady(): Promise<void>;
}

class LocalAssetStorage implements AssetStorage {
  constructor(private readonly baseDir: string) {}

  private pathFor(key: string): string {
    const base = resolve(this.baseDir);
    const target = resolve(base, key);
    if (target !== base && !target.startsWith(`${base}${sep}`)) {
      throw new Error("Invalid storage key");
    }
    return target;
  }

  async put(key: string, bytes: Uint8Array): Promise<void> {
    const target = this.pathFor(key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }

  async get(key: string): Promise<Uint8Array> {
    return new Uint8Array(await readFile(this.pathFor(key)));
  }

  async ensureReady(): Promise<void> {
    await mkdir(this.baseDir, { recursive: true });
  }
}

class S3AssetStorage implements AssetStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const env = getServerEnv();
    this.bucket = env.S3_BUCKET;
    this.client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    });
  }

  async put(key: string, bytes: Uint8Array, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: bytes,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  }

  async get(key: string): Promise<Uint8Array> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!response.Body) throw new Error("Asset body is empty");
    return new Uint8Array(await response.Body.transformToByteArray());
  }

  async ensureReady(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }
}

let storage: AssetStorage | null = null;

export function getAssetStorage(): AssetStorage {
  if (!storage) {
    const env = getServerEnv();
    storage =
      env.STORAGE_DRIVER === "s3"
        ? new S3AssetStorage()
        : new LocalAssetStorage(env.STORAGE_DIR);
  }
  return storage;
}

export function resetAssetStorageForTests(): void {
  storage = null;
}
