import { describe, expect, it } from "vitest";
import * as Y from "yjs";

import {
  addElement,
  createInitialDeckDoc,
  createSlide,
  createTextElement,
  duplicateElements,
  duplicateSlide,
  findElementDeletionConflicts,
  findSlideDeletionConflicts,
  getElementData,
  getOrderedSlideIds,
  getSlide,
  getSlideData,
  getSlideElements,
} from "../src/index.js";

const editorA = { id: "owner-a", name: "Blue Fox" };
const editorB = { id: "owner-b", name: "Amber Otter" };
const editorC = { id: "owner-c", name: "Coral Heron" };

function addRect(doc: Y.Doc, slideId: string, owner?: typeof editorA) {
  return addElement(doc, slideId, {
    id: `rect-${Math.random().toString(36).slice(2)}`,
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
    ...(owner ? { owner } : {}),
  });
}

describe("content ownership storage", () => {
  it("stores and reads owners on elements and leaves unowned elements unowned", () => {
    const doc = createInitialDeckDoc();
    const slideId = getOrderedSlideIds(doc)[0];
    const owned = addRect(doc, slideId, editorA);
    const unowned = createTextElement(doc, slideId, { text: "Legacy" });

    expect(
      getSlideData(doc, slideId)?.elements.find((element) => element.id === owned)?.owner,
    ).toEqual(editorA);
    expect(
      getSlideData(doc, slideId)?.elements.find((element) => element.id === unowned)?.owner,
    ).toBeUndefined();
    const element = getSlideElements(getSlide(doc, slideId)!).get(owned);
    expect(element ? getElementData(element)?.owner : undefined).toEqual(editorA);
  });

  it("stores owners on slides and leaves the initial slide unowned", () => {
    const doc = createInitialDeckDoc();
    const first = getOrderedSlideIds(doc)[0];
    const owned = createSlide(doc, first, editorA);

    expect(getSlideData(doc, first)?.owner).toBeUndefined();
    expect(getSlideData(doc, owned)?.owner).toEqual(editorA);
  });

  it("preserves ownership through a document clone", () => {
    const doc = createInitialDeckDoc();
    const first = getOrderedSlideIds(doc)[0];
    const ownedSlide = createSlide(doc, first, editorA);
    addRect(doc, ownedSlide, editorB);

    const clone = new Y.Doc();
    Y.applyUpdate(clone, Y.encodeStateAsUpdate(doc));

    expect(getSlideData(clone, ownedSlide)?.owner).toEqual(editorA);
    expect(getSlideData(clone, ownedSlide)?.elements[0].owner).toEqual(editorB);
  });
});

describe("ownership on duplication", () => {
  it("assigns a duplicated slide and its elements to the actor", () => {
    const doc = createInitialDeckDoc();
    const source = createSlide(doc, getOrderedSlideIds(doc)[0], editorB);
    const sourceElement = addRect(doc, source, editorB);

    const copy = duplicateSlide(doc, source, editorA);
    const copied = getSlideData(doc, copy);

    expect(copied?.owner).toEqual(editorA);
    expect(copied?.elements[0].owner).toEqual(editorA);
    expect(copied?.elements[0].id).not.toBe(sourceElement);
    expect(getSlideData(doc, source)?.owner).toEqual(editorB);
    expect(getSlideData(doc, source)?.elements[0].owner).toEqual(editorB);
  });

  it("assigns duplicated elements to the actor and keeps the source owner", () => {
    const doc = createInitialDeckDoc();
    const slideId = getOrderedSlideIds(doc)[0];
    const source = addRect(doc, slideId, editorB);
    const copies = duplicateElements(doc, slideId, [source], 24, editorA);

    expect(copies[0]).not.toBe(source);
    expect(getSlideData(doc, slideId)?.elements.find((element) => element.id === copies[0])?.owner).toEqual(
      editorA,
    );
    expect(getSlideData(doc, slideId)?.elements.find((element) => element.id === source)?.owner).toEqual(
      editorB,
    );
  });

  it("assigns ownership when duplicating unowned content", () => {
    const doc = createInitialDeckDoc();
    const slideId = getOrderedSlideIds(doc)[0];
    const source = addRect(doc, slideId);
    const copies = duplicateElements(doc, slideId, [source], 24, editorA);

    expect(getSlideData(doc, slideId)?.elements.find((element) => element.id === copies[0])?.owner).toEqual(
      editorA,
    );
    expect(getSlideData(doc, slideId)?.elements.find((element) => element.id === source)?.owner).toBeUndefined();
  });
});

describe("deletion conflicts", () => {
  it("allows deleting own and unowned elements", () => {
    const doc = createInitialDeckDoc();
    const slideId = getOrderedSlideIds(doc)[0];
    const own = addRect(doc, slideId, editorA);
    const unowned = createTextElement(doc, slideId, { text: "Legacy" });
    const slide = getSlideData(doc, slideId)!;

    expect(findElementDeletionConflicts(slide, [own, unowned], editorA.id)).toEqual([]);
  });

  it("reports another owner and blocks mixed selections as a whole", () => {
    const doc = createInitialDeckDoc();
    const slideId = getOrderedSlideIds(doc)[0];
    const own = addRect(doc, slideId, editorA);
    const other = addRect(doc, slideId, editorB);
    const slide = getSlideData(doc, slideId)!;

    expect(findElementDeletionConflicts(slide, [other], editorA.id)).toEqual([editorB]);
    expect(findElementDeletionConflicts(slide, [own, other], editorA.id)).toEqual([editorB]);
  });

  it("deduplicates and reports every other owner", () => {
    const doc = createInitialDeckDoc();
    const slideId = getOrderedSlideIds(doc)[0];
    const first = addRect(doc, slideId, editorB);
    const second = addRect(doc, slideId, editorB);
    const third = addRect(doc, slideId, editorC);
    const slide = getSlideData(doc, slideId)!;

    expect(findElementDeletionConflicts(slide, [first, second, third], editorA.id)).toEqual([
      editorB,
      editorC,
    ]);
  });

  it("protects a slide owned by another participant", () => {
    const doc = createInitialDeckDoc();
    const slideId = createSlide(doc, getOrderedSlideIds(doc)[0], editorB);
    const slide = getSlideData(doc, slideId)!;

    expect(findSlideDeletionConflicts(slide, editorA.id)).toEqual([editorB]);
  });

  it("protects another participant's element on an owned slide", () => {
    const doc = createInitialDeckDoc();
    const slideId = createSlide(doc, getOrderedSlideIds(doc)[0], editorA);
    addRect(doc, slideId, editorB);
    addRect(doc, slideId, editorA);
    const slide = getSlideData(doc, slideId)!;

    expect(findSlideDeletionConflicts(slide, editorA.id)).toEqual([editorB]);
  });

  it("allows deleting a slide with only own content and unowned content", () => {
    const doc = createInitialDeckDoc();
    const slideId = createSlide(doc, getOrderedSlideIds(doc)[0], editorA);
    addRect(doc, slideId, editorA);
    addRect(doc, slideId);
    const slide = getSlideData(doc, slideId)!;

    expect(findSlideDeletionConflicts(slide, editorA.id)).toEqual([]);
  });
});
