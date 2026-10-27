import { describe, expect, it } from "vitest";

import {
  createClipboardEnvelope,
  createClipboardHtml,
  createClipboardPayload,
  parseClipboardEnvelope,
  parseClipboardHtml,
  parseClipboardPayload,
  preparePastedElements,
  type ElementData,
} from "../src/index.js";

function textElement(overrides: Partial<ElementData> = {}): ElementData {
  return {
    id: "text-1",
    type: "text",
    x: 100,
    y: 200,
    width: 400,
    height: 100,
    rotation: 0,
    opacity: 1,
    text: "Hello",
    fontSize: 40,
    fill: "#111827",
    align: "left",
    ...overrides,
  } as ElementData;
}

const shapeElement: ElementData = {
  id: "shape-1",
  type: "shape",
  shape: "hexagon",
  x: 80,
  y: 120,
  width: 220,
  height: 160,
  rotation: 10,
  opacity: 1,
  fill: "#e0e7ff",
  stroke: "#4338ca",
  strokeWidth: 4,
};

const lineElement: ElementData = {
  id: "line-1",
  type: "line",
  x: 400,
  y: 300,
  width: 260,
  height: 100,
  rotation: 0,
  opacity: 1,
  stroke: "#0f172a",
  strokeWidth: 6,
  flipX: false,
  flipY: true,
};

describe("clipboard codec", () => {
  it("round-trips elements through JSON, HTML, and payloads", () => {
    const elements = [
      textElement(),
      textElement({ id: "text-2", x: 600 }),
      shapeElement,
      lineElement,
    ];
    const json = createClipboardEnvelope(elements);
    const html = createClipboardHtml(elements);
    const payload = createClipboardPayload(elements);

    expect(parseClipboardEnvelope(json)).toEqual(elements);
    expect(parseClipboardHtml(html)).toEqual(elements);
    expect(parseClipboardPayload(payload)).toEqual(elements);
    expect(parseClipboardPayload({ text: json })).toEqual(elements);
    expect(payload.text).toContain("4 elements");
  });

  it("rejects malformed, unknown, and oversized envelopes", () => {
    expect(parseClipboardEnvelope("not json")).toBeNull();
    expect(parseClipboardEnvelope(JSON.stringify({ format: "mini-deck/clipboard", version: 1 }))).toBeNull();
    expect(
      parseClipboardEnvelope(
        JSON.stringify({
          format: "mini-deck/clipboard",
          version: 1,
          elements: [textElement({ unknown: true } as ElementData)],
        }),
      ),
    ).toBeNull();
    expect(
      parseClipboardEnvelope(
        JSON.stringify({
          format: "mini-deck/clipboard",
          version: 1,
          elements: [{ ...shapeElement, shape: "octagon" }],
        }),
      ),
    ).toBeNull();
    expect(
      parseClipboardEnvelope(
        JSON.stringify({
          format: "mini-deck/clipboard",
          version: 1,
          elements: [{ ...lineElement, flipY: undefined }],
        }),
      ),
    ).toBeNull();
    expect(
      parseClipboardEnvelope(
        JSON.stringify({
          format: "mini-deck/clipboard",
          version: 1,
          elements: Array.from({ length: 201 }, (_, index) =>
            textElement({ id: `text-${index}` }),
          ),
        }),
      ),
    ).toBeNull();
    expect(parseClipboardEnvelope("x".repeat(1_000_001))).toBeNull();
  });

  it("assigns new ids, preserves relative spacing, and applies an offset", () => {
    const first = textElement({ id: "a", x: 100, y: 100 });
    const second = textElement({ id: "b", x: 300, y: 250 });
    const pasted = preparePastedElements([first, second], 24);

    expect(pasted).toHaveLength(2);
    expect(pasted[0].id).not.toBe("a");
    expect(pasted[1].id).not.toBe("b");
    expect(pasted[0].id).not.toBe(pasted[1].id);
    expect(pasted[0].x).toBe(124);
    expect(pasted[1].x).toBe(324);
    expect(pasted[1].x - pasted[0].x).toBe(second.x - first.x);
    expect(pasted[1].y - pasted[0].y).toBe(second.y - first.y);
  });
});
