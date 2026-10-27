import {
  MAX_CLIPBOARD_BYTES,
  MAX_CLIPBOARD_ELEMENTS,
} from "./constants.js";
import { cloneElementData } from "./operations.js";
import {
  clipboardEnvelopeSchema,
  type ClipboardEnvelope,
  type ElementData,
} from "./types.js";
import {
  base64UrlToString,
  stringToBase64Url,
} from "./tokens.js";

const clipboardEncoder = new TextEncoder();

export function createClipboardEnvelope(elements: readonly ElementData[]): string {
  const envelope: ClipboardEnvelope = {
    format: "mini-deck/clipboard",
    version: 1,
    elements: elements.slice(0, MAX_CLIPBOARD_ELEMENTS).map((element) =>
      structuredClone(element),
    ),
  };
  return JSON.stringify(envelope);
}

export function parseClipboardEnvelope(raw: string): ElementData[] | null {
  if (!raw || clipboardEncoder.encode(raw).length > MAX_CLIPBOARD_BYTES) {
    return null;
  }
  try {
    const parsed = clipboardEnvelopeSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    return parsed.data.elements;
  } catch {
    return null;
  }
}

export function preparePastedElements(
  elements: readonly ElementData[],
  offset = 24,
): ElementData[] {
  if (elements.length === 0) return [];
  return elements.slice(0, MAX_CLIPBOARD_ELEMENTS).map((element) => {
    const copy = cloneElementData(element, offset);
    return copy;
  });
}

export function createClipboardHtml(elements: readonly ElementData[]): string {
  const envelope = createClipboardEnvelope(elements);
  return `<div data-mini-deck-clipboard="${stringToBase64Url(envelope)}"></div>`;
}

export function parseClipboardHtml(html: string): ElementData[] | null {
  if (!html) return null;
  const match = html.match(/data-mini-deck-clipboard="([^"]+)"/u);
  if (!match) return null;
  try {
    return parseClipboardEnvelope(base64UrlToString(match[1]));
  } catch {
    return null;
  }
}

export function clipboardTextSummary(elements: readonly ElementData[]): string {
  return `${elements.length} element${elements.length === 1 ? "" : "s"} copied from Mini Deck`;
}

export interface ClipboardPayload {
  json: string;
  html: string;
  text: string;
}

export function createClipboardPayload(
  elements: readonly ElementData[],
): ClipboardPayload {
  return {
    json: createClipboardEnvelope(elements),
    html: createClipboardHtml(elements),
    text: clipboardTextSummary(elements),
  };
}

export function parseClipboardPayload(payload: {
  json?: string;
  html?: string;
  text?: string;
}): ElementData[] | null {
  if (payload.json) {
    const parsed = parseClipboardEnvelope(payload.json);
    if (parsed) return parsed;
  }
  if (payload.html) {
    const parsed = parseClipboardHtml(payload.html);
    if (parsed) return parsed;
  }
  if (payload.text) {
    const trimmed = payload.text.trim();
    if (trimmed.startsWith("{")) {
      const parsed = parseClipboardEnvelope(trimmed);
      if (parsed) return parsed;
    }
  }
  return null;
}
