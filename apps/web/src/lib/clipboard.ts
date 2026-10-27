import {
  clipboardTextSummary,
  createClipboardPayload,
  parseClipboardPayload,
  type ElementData,
} from "@mini-deck/deck";

let memoryClipboard: { elements: ElementData[]; copiedAt: number } | null = null;

export function writeElementsToClipboard(
  event: ClipboardEvent,
  elements: readonly ElementData[],
): void {
  const payload = createClipboardPayload(elements);
  event.clipboardData?.setData("text/plain", payload.text);
  event.clipboardData?.setData("text/html", payload.html);
  try {
    event.clipboardData?.setData("application/x-mini-deck+json", payload.json);
  } catch {
    // Some browsers reject custom MIME types; the HTML marker is the fallback.
  }
  memoryClipboard = { elements: elements.map((element) => structuredClone(element)), copiedAt: Date.now() };
}

export interface ParsedPaste {
  elements: ElementData[] | null;
  image: File | null;
  text: string | null;
}

export function parseClipboardEvent(event: ClipboardEvent): ParsedPaste {
  const data = event.clipboardData;
  const custom = data?.getData("application/x-mini-deck+json") ?? "";
  const html = data?.getData("text/html") ?? "";
  const plain = data?.getData("text/plain") ?? "";
  const files = data?.files ? Array.from(data.files) : [];
  const image = files.find((file) => file.type.startsWith("image/")) ?? null;

  const parts: ElementData[] = [];
  const parsed = parseClipboardPayload({ json: custom, html, text: plain });
  if (parsed) parts.push(...parsed);
  if (parts.length > 0) {
    return { elements: parts, image: null, text: null };
  }

  if (image) return { elements: null, image, text: null };

  if (plain.trim()) return { elements: null, image: null, text: plain };

  if (memoryClipboard && Date.now() - memoryClipboard.copiedAt < 60_000) {
    return {
      elements: memoryClipboard.elements.map((element) => structuredClone(element)),
      image: null,
      text: null,
    };
  }

  return { elements: null, image: null, text: null };
}

export function clipboardSummary(elements: readonly ElementData[]): string {
  return clipboardTextSummary(elements);
}
