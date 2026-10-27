import { loadEnvFile } from "node:process";

import { deriveViewToken } from "../packages/deck/dist/index.js";

try {
  loadEnvFile(".env");
} catch {
  // Environment variables can be supplied by the shell.
}

const baseUrl = process.env.API_URL ?? "http://localhost:3000";

async function expectOk(response: Response, label: string): Promise<Response> {
  if (!response.ok) {
    throw new Error(`${label} failed: ${response.status} ${await response.text()}`);
  }
  return response;
}

const health = await expectOk(await fetch(`${baseUrl}/api/health`), "health");
console.log("health", await health.json());

const created = (await (
  await expectOk(await fetch(`${baseUrl}/api/decks`, { method: "POST" }), "create deck")
).json()) as { deckId: string; editToken: string; title: string };
console.log("deck", created.deckId, created.title);

const viewToken = await deriveViewToken(created.editToken, created.deckId);

for (const [label, token, expectedRole] of [
  ["edit", created.editToken, "editor"],
  ["view", viewToken, "viewer"],
] as const) {
  const response = await expectOk(
    await fetch(`${baseUrl}/api/decks/${created.deckId}/session`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    }),
    `${label} session`,
  );
  const session = (await response.json()) as { role: string };
  if (session.role !== expectedRole) {
    throw new Error(`${label} session returned ${session.role}, expected ${expectedRole}`);
  }
  console.log(`${label} session`, session);
}

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAO0lEQVRIiWNQTX5NU8QwakHyaBC9Hk1FqqMZ7fVoUaE6Wpomj1Y4qqNVZvJoq+L1aMMrebTp+HpQt64Bwy3MTGkww7oAAAAASUVORK5CYII=",
  "base64",
);
const form = new FormData();
form.set("file", new File([png], "smoke.png", { type: "image/png" }));
const upload = (await (
  await expectOk(
    await fetch(`${baseUrl}/api/decks/${created.deckId}/assets`, {
      method: "POST",
      headers: { authorization: `Bearer ${created.editToken}` },
      body: form,
    }),
    "asset upload",
  )
).json()) as { asset: { id: string; url: string; width: number; height: number } };
console.log("asset", upload.asset);

const assetResponse = await expectOk(
  await fetch(`${baseUrl}${upload.asset.url}`),
  "asset delivery",
);
const bytes = new Uint8Array(await assetResponse.arrayBuffer());
if (bytes.byteLength === 0) throw new Error("asset delivery returned no bytes");
console.log("asset delivery", assetResponse.headers.get("content-type"), bytes.byteLength);

console.log("API smoke complete");
