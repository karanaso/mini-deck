import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";

import { setDeckTitle } from "../../packages/deck/dist/index.js";

const [url, name, token, title] = process.argv.slice(2);

if (!url || !name || !token || !title) {
  console.error("usage: persist-edit.mjs <ws-url> <deck-id> <token> <title>");
  process.exit(2);
}

const doc = new Y.Doc();
const provider = new HocuspocusProvider({ url, name, token, document: doc });

const timeout = setTimeout(() => {
  console.error("timed out waiting for the collaboration session");
  provider.destroy();
  doc.destroy();
  process.exit(1);
}, 15_000);

try {
  await new Promise((resolve, reject) => {
    provider.on("synced", resolve);
    provider.on("authenticationFailed", ({ reason }) => {
      reject(new Error(reason));
    });
  });
  clearTimeout(timeout);

  setDeckTitle(doc, title);
  await new Promise((resolve) => setTimeout(resolve, 1_500));

  provider.destroy();
  doc.destroy();
  console.log("edit sent");
} catch (error) {
  clearTimeout(timeout);
  provider.destroy();
  doc.destroy();
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
