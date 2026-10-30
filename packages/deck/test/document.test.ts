import { describe, expect, it } from "vitest";
import * as Y from "yjs";

import {
  addElement,
  bringToFront,
  createClipboardEnvelope,
  createInitialDeckDoc,
  createSlide,
  createTextElement,
  deleteElements,
  deleteSlide,
  duplicateElements,
  duplicateSlide,
  elementDataSchema,
  getDeckData,
  getElementData,
  getOrderedSlideIds,
  getSlide,
  getSlideData,
  getSlideElements,
  getDeckTitle,
  LastSlideError,
  nudgeElements,
  parseClipboardEnvelope,
  reorderSlide,
  setDeckTitle,
  setElementText,
  setSlideTransition,
  updateElement,
  updateYText,
} from "../src/index.js";

describe("initial document", () => {
  it("creates one blank 16:9 slide and metadata", () => {
    const doc = createInitialDeckDoc();
    const data = getDeckData(doc);

    expect(data.title).toBe("Untitled deck");
    expect(data.schemaVersion).toBe(1);
    expect(data.slides).toHaveLength(1);
    expect(data.slides[0].background).toBe("#ffffff");
    expect(data.slides[0].elements).toEqual([]);
  });

  it("renames a deck and normalizes empty or long titles", () => {
    const doc = createInitialDeckDoc();
    setDeckTitle(doc, "  Quarterly plan  ");
    expect(getDeckTitle(doc)).toBe("Quarterly plan");
    setDeckTitle(doc, "   ");
    expect(getDeckTitle(doc)).toBe("Untitled deck");
    setDeckTitle(doc, "x".repeat(200));
    expect(getDeckTitle(doc)).toHaveLength(120);
  });
});

describe("slides", () => {
  it("adds, duplicates, deletes, and reorders slides", () => {
    const doc = createInitialDeckDoc();
    const first = getOrderedSlideIds(doc)[0];
    const second = createSlide(doc, first);
    expect(getOrderedSlideIds(doc)).toEqual([first, second]);

    const textId = createTextElement(doc, second, { text: "Copy me" });
    const copy = duplicateSlide(doc, second);
    const copied = getSlideData(doc, copy);
    expect(copied?.elements[0].type).toBe("text");
    expect(copied?.elements[0]).not.toEqual(getSlideData(doc, second)?.elements[0]);
    expect(getOrderedSlideIds(doc)).toEqual([first, second, copy]);

    reorderSlide(doc, copy, 0);
    expect(getOrderedSlideIds(doc)[0]).toBe(copy);

    deleteSlide(doc, copy);
    expect(getOrderedSlideIds(doc)).toEqual([first, second]);
    expect(getSlide(doc, second)?.get("elements")).toBeInstanceOf(Y.Map);
    expect(textId).toBeTruthy();
  });

  it("prevents deleting the last slide", () => {
    const doc = createInitialDeckDoc();
    expect(() => deleteSlide(doc, getOrderedSlideIds(doc)[0])).toThrow(LastSlideError);
  });
});

describe("slide transitions", () => {
  it("defaults new slides to none", () => {
    const doc = createInitialDeckDoc();
    const slideId = getOrderedSlideIds(doc)[0];
    expect(getSlideData(doc, slideId)?.transition).toBe("none");

    const added = createSlide(doc, slideId);
    expect(getSlideData(doc, added)?.transition).toBe("none");
  });

  it("round-trips valid transitions and treats invalid values as none", () => {
    const doc = createInitialDeckDoc();
    const slideId = getOrderedSlideIds(doc)[0];

    setSlideTransition(doc, slideId, "push");
    expect(getSlideData(doc, slideId)?.transition).toBe("push");

    getSlide(doc, slideId)?.set("transition", "wipe");
    expect(getSlideData(doc, slideId)?.transition).toBe("none");

    getSlide(doc, slideId)?.delete("transition");
    expect(getSlideData(doc, slideId)?.transition).toBe("none");

    expect(() =>
      setSlideTransition(doc, slideId, "spin" as never),
    ).toThrow(/Invalid slide transition/);
  });

  it("copies the transition when duplicating a slide", () => {
    const doc = createInitialDeckDoc();
    const slideId = getOrderedSlideIds(doc)[0];
    setSlideTransition(doc, slideId, "zoom");

    const copy = duplicateSlide(doc, slideId);
    expect(getSlideData(doc, copy)?.transition).toBe("zoom");
  });
});

describe("image credit", () => {
  const credit = {
    provider: "unsplash" as const,
    photographerName: "Ada Lovelace",
    photographerUrl: "https://unsplash.com/@ada",
    sourceUrl: "https://unsplash.com/photos/abc",
  };

  it("round-trips valid credit and keeps it through duplication and clipboard", () => {
    const doc = createInitialDeckDoc();
    const slideId = getOrderedSlideIds(doc)[0];
    const id = addElement(doc, slideId, {
      id: "image-credit-1",
      type: "image",
      assetId: "asset-12345678",
      x: 10,
      y: 20,
      width: 300,
      height: 200,
      rotation: 0,
      opacity: 1,
      credit,
    });

    expect(getSlideData(doc, slideId)?.elements[0]).toMatchObject({
      type: "image",
      assetId: "asset-12345678",
      credit,
    });

    const copy = duplicateElements(doc, slideId, [id], 0);
    expect(
      getSlideData(doc, slideId)?.elements.find((element) => element.id === copy[0]),
    ).toMatchObject({ credit });

    const slide = getSlideData(doc, slideId);
    expect(slide).not.toBeNull();
    const parsed = parseClipboardEnvelope(
      createClipboardEnvelope(slide?.elements ?? []),
    );
    expect(parsed?.[0]).toMatchObject({ credit });
  });

  it("drops malformed credit without losing the image", () => {
    const doc = createInitialDeckDoc();
    const slideId = getOrderedSlideIds(doc)[0];
    const id = addElement(doc, slideId, {
      id: "image-credit-2",
      type: "image",
      assetId: "asset-87654321",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 1,
    });
    const element = getSlideElements(getSlide(doc, slideId)!).get(id) as Y.Map<unknown>;

    element.set("credit", { ...credit, provider: "flickr" });
    expect(getSlideData(doc, slideId)?.elements[0]).toMatchObject({
      type: "image",
      assetId: "asset-87654321",
    });
    expect(
      (getSlideData(doc, slideId)?.elements[0] as { credit?: unknown }).credit,
    ).toBeUndefined();

    element.set("credit", { ...credit, sourceUrl: "javascript:alert(1)" });
    expect(
      (getSlideData(doc, slideId)?.elements[0] as { credit?: unknown }).credit,
    ).toBeUndefined();
  });
});

describe("elements", () => {
  it("adds elements, validates them, and preserves z-order", () => {
    const doc = createInitialDeckDoc();
    const slideId = getOrderedSlideIds(doc)[0];
    const rect = addElement(doc, slideId, {
      id: "rect-1",
      type: "rect",
      x: 10,
      y: 20,
      width: 100,
      height: 80,
      rotation: 0,
      opacity: 1,
      fill: "#ffffff",
      stroke: "#000000",
      strokeWidth: 2,
      cornerRadius: 4,
    });
    const text = createTextElement(doc, slideId, { text: "Hello" });

    expect(rect).toBe("rect-1");
    expect(getSlideData(doc, slideId)?.elements.map((element) => element.id)).toEqual([
      "rect-1",
      text,
    ]);

    bringToFront(doc, slideId, ["rect-1"]);
    expect(getSlideData(doc, slideId)?.elements.map((element) => element.id)).toEqual([
      text,
      "rect-1",
    ]);

    expect(() =>
      elementDataSchema.parse({
        id: "bad",
        type: "rect",
        x: 0,
        y: 0,
        width: -1,
        height: 10,
        rotation: 0,
        opacity: 1,
        fill: "#fff",
        stroke: "#000",
        strokeWidth: 1,
        cornerRadius: 0,
      }),
    ).toThrow();
  });

  it("round-trips shape and line elements", () => {
    const doc = createInitialDeckDoc();
    const slideId = getOrderedSlideIds(doc)[0];

    const shape = addElement(doc, slideId, {
      id: "shape-1",
      type: "shape",
      shape: "pentagon",
      x: 40,
      y: 60,
      width: 180,
      height: 140,
      rotation: 15,
      opacity: 0.8,
      fill: "#e0e7ff",
      stroke: "#4338ca",
      strokeWidth: 5,
    });
    const line = addElement(doc, slideId, {
      id: "line-1",
      type: "line",
      x: 300,
      y: 220,
      width: 240,
      height: 120,
      rotation: 0,
      opacity: 1,
      stroke: "#0f172a",
      strokeWidth: 8,
      flipX: true,
      flipY: false,
    });

    const elements = getSlideData(doc, slideId)?.elements ?? [];
    expect(shape).toBe("shape-1");
    expect(line).toBe("line-1");
    expect(elements.find((element) => element.id === shape)).toMatchObject({
      type: "shape",
      shape: "pentagon",
      fill: "#e0e7ff",
      stroke: "#4338ca",
      strokeWidth: 5,
    });
    expect(elements.find((element) => element.id === line)).toMatchObject({
      type: "line",
      stroke: "#0f172a",
      strokeWidth: 8,
      flipX: true,
      flipY: false,
    });

    const duplicated = duplicateElements(doc, slideId, [shape], 20);
    expect(
      getSlideData(doc, slideId)?.elements.find((element) => element.id === duplicated[0]),
    ).toMatchObject({ type: "shape", shape: "pentagon", fill: "#e0e7ff" });
  });

  it("updates properties, nudges, duplicates, and deletes elements", () => {
    const doc = createInitialDeckDoc();
    const slideId = getOrderedSlideIds(doc)[0];
    const text = createTextElement(doc, slideId, {
      text: "Original",
      x: 100,
      y: 100,
    });

    updateElement(doc, slideId, text, {
      x: 120,
      fill: "#ff0000",
      fontSize: 64,
      align: "center",
    });
    nudgeElements(doc, slideId, [text], 10, -5);
    const updated = getElementData(getSlideElements(getSlide(doc, slideId)!).get(text) as Y.Map<unknown>);
    expect(updated).toMatchObject({ x: 130, y: 95, fontSize: 64, align: "center" });

    const copies = duplicateElements(doc, slideId, [text], 30);
    expect(copies).toHaveLength(1);
    const copy = getSlideData(doc, slideId)?.elements.find((element) => element.id === copies[0]);
    expect(copy).toMatchObject({ x: 160, y: 125, type: "text" });

    deleteElements(doc, slideId, [text]);
    expect(getSlideData(doc, slideId)?.elements).toHaveLength(1);
  });

  it("merges concurrent text edits without losing characters", () => {
    const base = createInitialDeckDoc();
    const slideId = getOrderedSlideIds(base)[0];
    const textId = createTextElement(base, slideId, { text: "Hello" });

    const clientA = new Y.Doc();
    const clientB = new Y.Doc();
    Y.applyUpdate(clientA, Y.encodeStateAsUpdate(base));
    Y.applyUpdate(clientB, Y.encodeStateAsUpdate(base));

    const elementA = getSlideElements(getSlide(clientA, slideId)!).get(textId) as Y.Map<unknown>;
    const elementB = getSlideElements(getSlide(clientB, slideId)!).get(textId) as Y.Map<unknown>;
    const yTextA = elementA.get("text") as Y.Text;
    const yTextB = elementB.get("text") as Y.Text;

    updateYText(yTextA, "Hello A");
    updateYText(yTextB, "Hello B");

    Y.applyUpdate(clientA, Y.encodeStateAsUpdate(clientB));
    Y.applyUpdate(clientB, Y.encodeStateAsUpdate(clientA));

    const mergedA = (getSlideElements(getSlide(clientA, slideId)!).get(textId) as Y.Map<unknown>)
      .get("text") as Y.Text;
    const mergedB = (getSlideElements(getSlide(clientB, slideId)!).get(textId) as Y.Map<unknown>)
      .get("text") as Y.Text;

    expect(mergedA.toString()).toBe(mergedB.toString());
    expect(mergedA.toString()).toContain("A");
    expect(mergedA.toString()).toContain("B");
  });

  it("sets text through a nested Y.Text", () => {
    const doc = createInitialDeckDoc();
    const slideId = getOrderedSlideIds(doc)[0];
    const textId = createTextElement(doc, slideId, { text: "Before" });
    setElementText(doc, slideId, textId, "After\nsecond line");
    const element = getSlideElements(getSlide(doc, slideId)!).get(textId) as Y.Map<unknown>;
    expect(element.get("text")).toBeInstanceOf(Y.Text);
    expect((element.get("text") as Y.Text).toString()).toBe("After\nsecond line");
  });
});
