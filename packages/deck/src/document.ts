import * as Y from "yjs";

import {
  DECK_SCHEMA_VERSION,
  DEFAULT_SLIDE_BACKGROUND,
  DEFAULT_TITLE,
  LOCAL_ORIGIN,
  MAX_TITLE_LENGTH,
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
} from "./constants.js";
import type {
  ArrowElementData,
  DeckData,
  ElementData,
  EllipseElementData,
  ImageCredit,
  ImageElementData,
  LineElementData,
  RectElementData,
  ShapeElementData,
  SlideData,
  SlideTransition,
  TextElementData,
} from "./types.js";
import {
  isImageCreditProvider,
  isShapeKind,
  isSlideTransition,
} from "./types.js";
import { createElementId } from "./tokens.js";

export type SlideMap = Y.Map<unknown>;
export type ElementMap = Y.Map<unknown>;

export function createInitialDeckDoc(title: string = DEFAULT_TITLE): Y.Doc {
  const doc = new Y.Doc();
  const slideId = createElementId();

  doc.transact(() => {
    const meta = doc.getMap<unknown>("meta");
    meta.set("schemaVersion", DECK_SCHEMA_VERSION);
    meta.set("title", normalizeTitle(title));

    const slides = doc.getMap<SlideMap>("slides");
    const slide = createSlideMap(slideId);
    slides.set(slideId, slide);
    doc.getArray<string>("slideOrder").push([slideId]);
  }, "mini-deck:init");

  return doc;
}

export function createSlideMap(slideId: string = createElementId()): SlideMap {
  const slide = new Y.Map<unknown>();
  slide.set("background", DEFAULT_SLIDE_BACKGROUND);
  slide.set("transition", "none");
  slide.set("elements", new Y.Map<ElementMap>());
  slide.set("elementOrder", new Y.Array<string>());
  slide.set("id", slideId);
  return slide;
}

export function normalizeTitle(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_TITLE;
  return trimmed.slice(0, MAX_TITLE_LENGTH);
}

export function getMeta(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap<unknown>("meta");
}

export function getSlides(doc: Y.Doc): Y.Map<SlideMap> {
  return doc.getMap<SlideMap>("slides");
}

export function getSlideOrder(doc: Y.Doc): Y.Array<string> {
  return doc.getArray<string>("slideOrder");
}

export function getDeckTitle(doc: Y.Doc): string {
  const title = getMeta(doc).get("title");
  return typeof title === "string" && title.trim() ? title : DEFAULT_TITLE;
}

export function setDeckTitle(doc: Y.Doc, title: string): void {
  doc.transact(() => {
    getMeta(doc).set("title", normalizeTitle(title));
  }, LOCAL_ORIGIN);
}

export function getSlide(doc: Y.Doc, slideId: string): SlideMap | undefined {
  const slide = getSlides(doc).get(slideId);
  return slide instanceof Y.Map ? (slide as SlideMap) : undefined;
}

export function getSlideBackground(slide: SlideMap): string {
  const background = slide.get("background");
  return typeof background === "string" ? background : DEFAULT_SLIDE_BACKGROUND;
}

export function getSlideTransition(slide: SlideMap): SlideTransition {
  const transition = slide.get("transition");
  return isSlideTransition(transition) ? transition : "none";
}

export function getSlideElements(slide: SlideMap): Y.Map<ElementMap> {
  const elements = slide.get("elements");
  if (elements instanceof Y.Map) return elements as Y.Map<ElementMap>;
  const created = new Y.Map<ElementMap>();
  slide.set("elements", created);
  return created;
}

export function getElementOrder(slide: SlideMap): Y.Array<string> {
  const order = slide.get("elementOrder");
  if (order instanceof Y.Array) return order as Y.Array<string>;
  const created = new Y.Array<string>();
  slide.set("elementOrder", created);
  return created;
}

export function getOrderedSlideIds(doc: Y.Doc): string[] {
  const slides = getSlides(doc);
  return getSlideOrder(doc)
    .toArray()
    .filter((slideId) => slides.has(slideId));
}

export function getElementData(element: ElementMap): ElementData | null {
  const type = element.get("type");
  const id = element.get("id");
  if (typeof id !== "string" || typeof type !== "string") return null;

  const base = {
    id,
    x: numberValue(element.get("x"), 0),
    y: numberValue(element.get("y"), 0),
    width: numberValue(element.get("width"), 200),
    height: numberValue(element.get("height"), 120),
    rotation: numberValue(element.get("rotation"), 0),
    opacity: numberValue(element.get("opacity"), 1),
  };

  if (type === "text") {
    const content = element.get("text");
    return {
      ...base,
      type: "text",
      text:
        content instanceof Y.Text
          ? content.toString()
          : typeof content === "string"
            ? content
            : "",
      fontSize: numberValue(element.get("fontSize"), 48),
      fill: stringValue(element.get("fill"), "#111827"),
      align: alignValue(element.get("align")),
    } satisfies TextElementData;
  }

  if (type === "rect") {
    return {
      ...base,
      type: "rect",
      fill: stringValue(element.get("fill"), "#dbeafe"),
      stroke: stringValue(element.get("stroke"), "#2563eb"),
      strokeWidth: numberValue(element.get("strokeWidth"), 4),
      cornerRadius: numberValue(element.get("cornerRadius"), 0),
    } satisfies RectElementData;
  }

  if (type === "ellipse") {
    return {
      ...base,
      type: "ellipse",
      fill: stringValue(element.get("fill"), "#dcfce7"),
      stroke: stringValue(element.get("stroke"), "#16a34a"),
      strokeWidth: numberValue(element.get("strokeWidth"), 4),
    } satisfies EllipseElementData;
  }

  if (type === "arrow") {
    return {
      ...base,
      type: "arrow",
      stroke: stringValue(element.get("stroke"), "#111827"),
      strokeWidth: numberValue(element.get("strokeWidth"), 6),
      flipX: booleanValue(element.get("flipX"), false),
      flipY: booleanValue(element.get("flipY"), false),
    } satisfies ArrowElementData;
  }

  if (type === "image") {
    const assetId = element.get("assetId");
    if (typeof assetId !== "string" || !assetId) return null;
    const credit = imageCreditValue(element.get("credit"));
    return {
      ...base,
      type: "image",
      assetId,
      ...(credit ? { credit } : {}),
    } satisfies ImageElementData;
  }

  if (type === "shape") {
    const shape = element.get("shape");
    if (!isShapeKind(shape)) return null;
    return {
      ...base,
      type: "shape",
      shape,
      fill: stringValue(element.get("fill"), "#e0e7ff"),
      stroke: stringValue(element.get("stroke"), "#4338ca"),
      strokeWidth: numberValue(element.get("strokeWidth"), 4),
    } satisfies ShapeElementData;
  }

  if (type === "line") {
    return {
      ...base,
      type: "line",
      stroke: stringValue(element.get("stroke"), "#111827"),
      strokeWidth: numberValue(element.get("strokeWidth"), 6),
      flipX: booleanValue(element.get("flipX"), false),
      flipY: booleanValue(element.get("flipY"), false),
    } satisfies LineElementData;
  }

  return null;
}

export function getSlideData(doc: Y.Doc, slideId: string): SlideData | null {
  const slide = getSlide(doc, slideId);
  if (!slide) return null;
  const elements = getSlideElements(slide);
  const ordered = getElementOrder(slide)
    .toArray()
    .map((elementId) => elements.get(elementId))
    .filter((element): element is ElementMap => element instanceof Y.Map)
    .map((element) => getElementData(element))
    .filter((element): element is ElementData => element !== null);

  return {
    id: slideId,
    background: getSlideBackground(slide),
    transition: getSlideTransition(slide),
    elements: ordered,
  };
}

export function getDeckData(doc: Y.Doc): DeckData {
  return {
    schemaVersion: numberValue(getMeta(doc).get("schemaVersion"), DECK_SCHEMA_VERSION),
    title: getDeckTitle(doc),
    slides: getOrderedSlideIds(doc)
      .map((slideId) => getSlideData(doc, slideId))
      .filter((slide): slide is SlideData => slide !== null),
  };
}

export function getElementText(element: ElementMap): Y.Text | null {
  const content = element.get("text");
  return content instanceof Y.Text ? content : null;
}

export function getSlideTitleElement(slide: SlideData): TextElementData | undefined {
  return slide.elements.find((element) => element.type === "text") as
    | TextElementData
    | undefined;
}

export const SLIDE_SIZE = { width: SLIDE_WIDTH, height: SLIDE_HEIGHT } as const;

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value ? value : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function alignValue(value: unknown): "left" | "center" | "right" {
  return value === "center" || value === "right" ? value : "left";
}

function imageCreditValue(value: unknown): ImageCredit | undefined {
  if (!value || typeof value !== "object") return undefined;
  const credit = value as Record<string, unknown>;
  const provider = credit.provider;
  const photographerName = credit.photographerName;
  const photographerUrl = safeHttpsUrl(credit.photographerUrl);
  const sourceUrl = safeHttpsUrl(credit.sourceUrl);
  if (
    !isImageCreditProvider(provider) ||
    typeof photographerName !== "string" ||
    !photographerName.trim() ||
    photographerName.length > 200 ||
    !photographerUrl ||
    !sourceUrl
  ) {
    return undefined;
  }
  return {
    provider,
    photographerName: photographerName.trim(),
    photographerUrl,
    sourceUrl,
  };
}

function safeHttpsUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 2048) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
