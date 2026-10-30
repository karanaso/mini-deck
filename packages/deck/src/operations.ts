import * as Y from "yjs";

import {
  LOCAL_ORIGIN,
  MAX_ELEMENTS_PER_DECK,
  MAX_SLIDES,
  MAX_TEXT_LENGTH,
} from "./constants.js";
import {
  createSlideMap,
  getElementData,
  getElementOrder,
  getElementText,
  getOrderedSlideIds,
  getSlide,
  getSlideData,
  getSlideElements,
  getSlides,
  type ElementMap,
  type SlideMap,
} from "./document.js";
import { createElementId } from "./tokens.js";
import {
  elementDataSchema,
  isSlideTransition,
  type ElementData,
  type SlideData,
  type SlideTransition,
  type TextElementData,
} from "./types.js";

export class LastSlideError extends Error {
  constructor() {
    super("A deck needs at least one slide");
    this.name = "LastSlideError";
  }
}

export class DeckLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeckLimitError";
  }
}

export function withLocalTransaction<T>(doc: Y.Doc, operation: () => T): T {
  return doc.transact(operation, LOCAL_ORIGIN);
}

export function countElements(doc: Y.Doc): number {
  let total = 0;
  for (const slideId of getOrderedSlideIds(doc)) {
    const slide = getSlide(doc, slideId);
    if (slide) total += getSlideElements(slide).size;
  }
  return total;
}

function requireSlide(doc: Y.Doc, slideId: string): SlideMap {
  const slide = getSlide(doc, slideId);
  if (!slide) throw new Error(`Slide not found: ${slideId}`);
  return slide;
}

function requireElement(
  doc: Y.Doc,
  slideId: string,
  elementId: string,
): ElementMap {
  const slide = requireSlide(doc, slideId);
  const element = getSlideElements(slide).get(elementId);
  if (!(element instanceof Y.Map)) {
    throw new Error(`Element not found: ${elementId}`);
  }
  return element as ElementMap;
}

export function createSlide(doc: Y.Doc, afterSlideId?: string): string {
  const slideId = createElementId();
  withLocalTransaction(doc, () => {
    const slides = getSlides(doc);
    if (slides.size >= MAX_SLIDES) {
      throw new DeckLimitError(`A deck can have at most ${MAX_SLIDES} slides`);
    }
    const order = doc.getArray<string>("slideOrder");
    slides.set(slideId, createSlideMap(slideId));
    const existingIndex = afterSlideId ? order.toArray().indexOf(afterSlideId) : -1;
    const insertAt = existingIndex >= 0 ? existingIndex + 1 : order.length;
    order.insert(insertAt, [slideId]);
  });
  return slideId;
}

export function duplicateSlide(doc: Y.Doc, slideId: string): string {
  const source = getSlideData(doc, slideId);
  if (!source) throw new Error(`Slide not found: ${slideId}`);

  const newSlideId = createElementId();
  withLocalTransaction(doc, () => {
    const slides = getSlides(doc);
    if (slides.size >= MAX_SLIDES) {
      throw new DeckLimitError(`A deck can have at most ${MAX_SLIDES} slides`);
    }
    const newSlide = createSlideMap(newSlideId);
    newSlide.set("background", source.background);
    newSlide.set("transition", source.transition);
    const elements = getSlideElements(newSlide);
    const elementOrder = getElementOrder(newSlide);
    for (const element of source.elements) {
      const copy = cloneElementData(element, 0);
      elements.set(copy.id, createElementMap(copy));
      elementOrder.push([copy.id]);
    }
    slides.set(newSlideId, newSlide);
    const order = doc.getArray<string>("slideOrder");
    const sourceIndex = order.toArray().indexOf(slideId);
    order.insert(sourceIndex >= 0 ? sourceIndex + 1 : order.length, [newSlideId]);
  });
  return newSlideId;
}

export function deleteSlide(doc: Y.Doc, slideId: string): void {
  const order = doc.getArray<string>("slideOrder");
  if (order.length <= 1) throw new LastSlideError();
  withLocalTransaction(doc, () => {
    const slides = getSlides(doc);
    const index = order.toArray().indexOf(slideId);
    if (index === -1) return;
    slides.delete(slideId);
    order.delete(index, 1);
  });
}

export function reorderSlide(doc: Y.Doc, slideId: string, toIndex: number): void {
  withLocalTransaction(doc, () => {
    const order = doc.getArray<string>("slideOrder");
    const fromIndex = order.toArray().indexOf(slideId);
    if (fromIndex === -1) return;
    const clamped = Math.max(0, Math.min(toIndex, order.length - 1));
    if (fromIndex === clamped) return;
    order.delete(fromIndex, 1);
    order.insert(clamped, [slideId]);
  });
}

export function setSlideTransition(
  doc: Y.Doc,
  slideId: string,
  transition: SlideTransition,
): void {
  if (!isSlideTransition(transition)) {
    throw new Error(`Invalid slide transition: ${String(transition)}`);
  }
  withLocalTransaction(doc, () => {
    requireSlide(doc, slideId).set("transition", transition);
  });
}

export function addElement(
  doc: Y.Doc,
  slideId: string,
  data: ElementData,
): string {
  const parsed = elementDataSchema.parse(data);
  withLocalTransaction(doc, () => {
    if (countElements(doc) >= MAX_ELEMENTS_PER_DECK) {
      throw new DeckLimitError(
        `A deck can have at most ${MAX_ELEMENTS_PER_DECK} elements`,
      );
    }
    const slide = requireSlide(doc, slideId);
    getSlideElements(slide).set(parsed.id, createElementMap(parsed));
    getElementOrder(slide).push([parsed.id]);
  });
  return parsed.id;
}

export function createTextElement(
  doc: Y.Doc,
  slideId: string,
  options: Partial<Omit<TextElementData, "id" | "type">> = {},
): string {
  return addElement(doc, slideId, {
    id: createElementId(),
    type: "text",
    x: 240,
    y: 180,
    width: 640,
    height: 140,
    rotation: 0,
    opacity: 1,
    text: "",
    fontSize: 48,
    fill: "#111827",
    align: "left",
    ...options,
  });
}

export function updateElement(
  doc: Y.Doc,
  slideId: string,
  elementId: string,
  patch: Record<string, unknown>,
): void {
  withLocalTransaction(doc, () => {
    const element = requireElement(doc, slideId, elementId);
    const type = element.get("type");

    if (typeof patch.text === "string" && type === "text") {
      updateYText(getElementText(element), patch.text);
    }

    const numericKeys = [
      "x",
      "y",
      "width",
      "height",
      "rotation",
      "opacity",
      "fontSize",
      "strokeWidth",
      "cornerRadius",
    ] as const;
    for (const key of numericKeys) {
      const value = patch[key];
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      if ((key === "width" || key === "height") && value < 1) continue;
      if (key === "opacity") {
        element.set(key, Math.max(0, Math.min(1, value)));
      } else if (key === "fontSize") {
        element.set(key, Math.max(4, Math.min(500, value)));
      } else if (key === "strokeWidth") {
        element.set(key, Math.max(0, Math.min(100, value)));
      } else if (key === "cornerRadius") {
        element.set(key, Math.max(0, value));
      } else {
        element.set(key, value);
      }
    }

    for (const key of ["fill", "stroke", "align"] as const) {
      const value = patch[key];
      if (typeof value === "string" && value.length > 0 && value.length <= 64) {
        element.set(key, value);
      }
    }

    for (const key of ["flipX", "flipY"] as const) {
      if (typeof patch[key] === "boolean") element.set(key, patch[key]);
    }
  });
}

export function setElementText(
  doc: Y.Doc,
  slideId: string,
  elementId: string,
  text: string,
): void {
  if (text.length > MAX_TEXT_LENGTH) {
    throw new DeckLimitError(
      `Text elements are limited to ${MAX_TEXT_LENGTH} characters`,
    );
  }
  withLocalTransaction(doc, () => {
    const element = requireElement(doc, slideId, elementId);
    updateYText(getElementText(element), text);
  });
}

export function deleteElements(
  doc: Y.Doc,
  slideId: string,
  elementIds: readonly string[],
): void {
  if (elementIds.length === 0) return;
  withLocalTransaction(doc, () => {
    const slide = requireSlide(doc, slideId);
    const elements = getSlideElements(slide);
    const order = getElementOrder(slide);
    const ids = new Set(elementIds);
    for (const elementId of ids) elements.delete(elementId);
    const remaining = order.toArray().filter((elementId) => !ids.has(elementId));
    order.delete(0, order.length);
    order.push(remaining);
  });
}

export function duplicateElements(
  doc: Y.Doc,
  slideId: string,
  elementIds: readonly string[],
  offset = 24,
): string[] {
  if (elementIds.length === 0) return [];
  const source = getSlideData(doc, slideId);
  if (!source) throw new Error(`Slide not found: ${slideId}`);
  const selected = new Set(elementIds);
  const elementsToCopy = source.elements.filter((element) => selected.has(element.id));
  if (elementsToCopy.length === 0) return [];

  const newIds: string[] = [];
  withLocalTransaction(doc, () => {
    if (
      countElements(doc) + elementsToCopy.length >
      MAX_ELEMENTS_PER_DECK
    ) {
      throw new DeckLimitError(
        `A deck can have at most ${MAX_ELEMENTS_PER_DECK} elements`,
      );
    }
    const slide = requireSlide(doc, slideId);
    const elements = getSlideElements(slide);
    const order = getElementOrder(slide);
    for (const element of elementsToCopy) {
      const copy = cloneElementData(element, offset);
      elements.set(copy.id, createElementMap(copy));
      order.push([copy.id]);
      newIds.push(copy.id);
    }
  });
  return newIds;
}

export function nudgeElements(
  doc: Y.Doc,
  slideId: string,
  elementIds: readonly string[],
  deltaX: number,
  deltaY: number,
): void {
  if (elementIds.length === 0) return;
  withLocalTransaction(doc, () => {
    for (const elementId of elementIds) {
      const element = requireElement(doc, slideId, elementId);
      const x = element.get("x");
      const y = element.get("y");
      element.set("x", (typeof x === "number" ? x : 0) + deltaX);
      element.set("y", (typeof y === "number" ? y : 0) + deltaY);
    }
  });
}

export function bringForward(
  doc: Y.Doc,
  slideId: string,
  elementIds: readonly string[],
): void {
  reorderElements(doc, slideId, elementIds, "forward");
}

export function sendBackward(
  doc: Y.Doc,
  slideId: string,
  elementIds: readonly string[],
): void {
  reorderElements(doc, slideId, elementIds, "backward");
}

export function bringToFront(
  doc: Y.Doc,
  slideId: string,
  elementIds: readonly string[],
): void {
  reorderElements(doc, slideId, elementIds, "front");
}

export function sendToBack(
  doc: Y.Doc,
  slideId: string,
  elementIds: readonly string[],
): void {
  reorderElements(doc, slideId, elementIds, "back");
}

function reorderElements(
  doc: Y.Doc,
  slideId: string,
  elementIds: readonly string[],
  direction: "forward" | "backward" | "front" | "back",
): void {
  if (elementIds.length === 0) return;
  withLocalTransaction(doc, () => {
    const slide = requireSlide(doc, slideId);
    const order = getElementOrder(slide);
    const current = order.toArray();
    const selected = new Set(elementIds);
    const valid = current.filter((elementId) => selected.has(elementId));
    if (valid.length === 0) return;

    let next: string[];
    if (direction === "front") {
      next = [...current.filter((id) => !selected.has(id)), ...valid];
    } else if (direction === "back") {
      next = [...valid, ...current.filter((id) => !selected.has(id))];
    } else {
      next = [...current];
      const step = direction === "forward" ? 1 : -1;
      const indices =
        direction === "forward"
          ? current.map((_, index) => index).reverse()
          : current.map((_, index) => index);
      for (const index of indices) {
        if (!selected.has(next[index])) continue;
        const target = index + step;
        if (target < 0 || target >= next.length) continue;
        if (selected.has(next[target])) continue;
        [next[index], next[target]] = [next[target], next[index]];
      }
    }

    order.delete(0, order.length);
    order.push(next);
  });
}

export function updateYText(text: Y.Text | null, nextValue: string): void {
  if (!text) return;
  const current = text.toString();
  if (current === nextValue) return;

  let start = 0;
  while (
    start < current.length &&
    start < nextValue.length &&
    current[start] === nextValue[start]
  ) {
    start += 1;
  }

  let currentEnd = current.length;
  let nextEnd = nextValue.length;
  while (
    currentEnd > start &&
    nextEnd > start &&
    current[currentEnd - 1] === nextValue[nextEnd - 1]
  ) {
    currentEnd -= 1;
    nextEnd -= 1;
  }

  if (currentEnd > start) text.delete(start, currentEnd - start);
  if (nextEnd > start) text.insert(start, nextValue.slice(start, nextEnd));
}

export function cloneElementData(
  element: ElementData,
  offset = 24,
): ElementData {
  return {
    ...structuredClone(element),
    id: createElementId(),
    x: element.x + offset,
    y: element.y + offset,
  };
}

export function createElementMap(data: ElementData): ElementMap {
  const element = new Y.Map<unknown>();
  element.set("id", data.id);
  element.set("type", data.type);
  element.set("x", data.x);
  element.set("y", data.y);
  element.set("width", data.width);
  element.set("height", data.height);
  element.set("rotation", data.rotation);
  element.set("opacity", data.opacity);

  switch (data.type) {
    case "text": {
      const text = new Y.Text();
      if (data.text) text.insert(0, data.text);
      element.set("text", text);
      element.set("fontSize", data.fontSize);
      element.set("fill", data.fill);
      element.set("align", data.align);
      break;
    }
    case "rect":
      element.set("fill", data.fill);
      element.set("stroke", data.stroke);
      element.set("strokeWidth", data.strokeWidth);
      element.set("cornerRadius", data.cornerRadius);
      break;
    case "ellipse":
      element.set("fill", data.fill);
      element.set("stroke", data.stroke);
      element.set("strokeWidth", data.strokeWidth);
      break;
    case "arrow":
      element.set("stroke", data.stroke);
      element.set("strokeWidth", data.strokeWidth);
      element.set("flipX", data.flipX);
      element.set("flipY", data.flipY);
      break;
    case "image":
      element.set("assetId", data.assetId);
      if (data.credit) element.set("credit", structuredClone(data.credit));
      break;
    case "shape":
      element.set("shape", data.shape);
      element.set("fill", data.fill);
      element.set("stroke", data.stroke);
      element.set("strokeWidth", data.strokeWidth);
      break;
    case "line":
      element.set("stroke", data.stroke);
      element.set("strokeWidth", data.strokeWidth);
      element.set("flipX", data.flipX);
      element.set("flipY", data.flipY);
      break;
  }

  return element;
}

export function createSlideDataMap(data: SlideData): SlideMap {
  const slide = createSlideMap(data.id);
  slide.set("background", data.background);
  slide.set("transition", isSlideTransition(data.transition) ? data.transition : "none");
  const elements = getSlideElements(slide);
  const order = getElementOrder(slide);
  for (const element of data.elements) {
    elements.set(element.id, createElementMap(element));
    order.push([element.id]);
  }
  return slide;
}

export function getSlideElement(doc: Y.Doc, slideId: string, elementId: string): ElementData | null {
  const slide = requireSlide(doc, slideId);
  const element = getSlideElements(slide).get(elementId);
  return element instanceof Y.Map ? getElementData(element as ElementMap) : null;
}
