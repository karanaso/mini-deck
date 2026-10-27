import { describe, expect, it } from "vitest";

import {
  MAX_ELEMENTS_PER_DECK,
  MAX_SLIDES,
  MAX_TEXT_LENGTH,
  MAX_TITLE_LENGTH,
  addElement,
  createElementId,
  createInitialDeckDoc,
  createSlide,
  createTextElement,
  getDeckTitle,
  getOrderedSlideIds,
  setDeckTitle,
  setElementText,
} from "../src/index.js";

function rect(index: number) {
  return {
    id: createElementId(),
    type: "rect" as const,
    x: index % 100,
    y: Math.floor(index / 100),
    width: 10,
    height: 10,
    rotation: 0,
    opacity: 1,
    fill: "#fff",
    stroke: "#000",
    strokeWidth: 1,
    cornerRadius: 0,
  };
}

function shape(index: number) {
  return {
    id: createElementId(),
    type: "shape" as const,
    shape: "triangle" as const,
    x: index % 100,
    y: Math.floor(index / 100),
    width: 10,
    height: 10,
    rotation: 0,
    opacity: 1,
    fill: "#fff",
    stroke: "#000",
    strokeWidth: 1,
  };
}

describe("deck limits", () => {
  it("limits a deck to 100 slides", () => {
    const doc = createInitialDeckDoc();
    let last = getOrderedSlideIds(doc)[0];
    for (let index = 1; index < MAX_SLIDES; index += 1) {
      last = createSlide(doc, last);
    }
    expect(getOrderedSlideIds(doc)).toHaveLength(MAX_SLIDES);
    expect(() => createSlide(doc, last)).toThrow(/at most 100 slides/u);
  });

  it("limits a deck to 2,000 elements", () => {
    const doc = createInitialDeckDoc();
    const slideId = getOrderedSlideIds(doc)[0];
    for (let index = 0; index < MAX_ELEMENTS_PER_DECK; index += 1) {
      addElement(doc, slideId, rect(index));
    }
    expect(() => addElement(doc, slideId, rect(MAX_ELEMENTS_PER_DECK))).toThrow(
      /at most 2000 elements/u,
    );
    expect(() => addElement(doc, slideId, shape(MAX_ELEMENTS_PER_DECK + 1))).toThrow(
      /at most 2000 elements/u,
    );
  });

  it("limits text, normalizes long titles, and validates element sizes", () => {
    const doc = createInitialDeckDoc();
    const slideId = getOrderedSlideIds(doc)[0];
    const textId = createTextElement(doc, slideId, { text: "short" });
    expect(() =>
      setElementText(doc, slideId, textId, "x".repeat(MAX_TEXT_LENGTH + 1)),
    ).toThrow(/limited to 10000 characters/u);

    setDeckTitle(doc, "x".repeat(MAX_TITLE_LENGTH + 50));
    expect(getDeckTitle(doc)).toHaveLength(MAX_TITLE_LENGTH);

    expect(() =>
      addElement(doc, slideId, {
        ...rect(0),
        width: 0,
      }),
    ).toThrow();
  });
});
