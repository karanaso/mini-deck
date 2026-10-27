import { z } from "zod";

import {
  MAX_CLIPBOARD_ELEMENTS,
  MAX_PARTICIPANT_NAME,
  MAX_SELECTION_IDS,
  MAX_TEXT_LENGTH,
  MAX_TITLE_LENGTH,
} from "./constants.js";

export const SHAPE_KINDS = [
  "triangle",
  "diamond",
  "parallelogram",
  "trapezoid",
  "pentagon",
  "hexagon",
  "star",
] as const;

export type ShapeKind = (typeof SHAPE_KINDS)[number];
export type ElementType =
  | "text"
  | "rect"
  | "ellipse"
  | "arrow"
  | "image"
  | "shape"
  | "line";
export type TextAlign = "left" | "center" | "right";
export type Role = "editor" | "viewer";

export function isShapeKind(value: unknown): value is ShapeKind {
  return (
    typeof value === "string" &&
    (SHAPE_KINDS as readonly string[]).includes(value)
  );
}

interface BaseElementData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
}

export interface TextElementData extends BaseElementData {
  type: "text";
  text: string;
  fontSize: number;
  fill: string;
  align: TextAlign;
}

export interface RectElementData extends BaseElementData {
  type: "rect";
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
}

export interface EllipseElementData extends BaseElementData {
  type: "ellipse";
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface ArrowElementData extends BaseElementData {
  type: "arrow";
  stroke: string;
  strokeWidth: number;
  flipX: boolean;
  flipY: boolean;
}

export interface ImageElementData extends BaseElementData {
  type: "image";
  assetId: string;
}

export interface ShapeElementData extends BaseElementData {
  type: "shape";
  shape: ShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface LineElementData extends BaseElementData {
  type: "line";
  stroke: string;
  strokeWidth: number;
  flipX: boolean;
  flipY: boolean;
}

export type ElementData =
  | TextElementData
  | RectElementData
  | EllipseElementData
  | ArrowElementData
  | ImageElementData
  | ShapeElementData
  | LineElementData;

export interface SlideData {
  id: string;
  background: string;
  elements: ElementData[];
}

export interface DeckData {
  schemaVersion: number;
  title: string;
  slides: SlideData[];
}

export interface ParticipantState {
  id: string;
  name: string;
  color: string;
}

export interface CursorState {
  slideId: string;
  x: number;
  y: number;
}

export interface SelectionState {
  slideId: string;
  ids: string[];
}

export interface AwarenessState {
  user: ParticipantState;
  cursor: CursorState | null;
  selection: SelectionState | null;
}

export interface ClipboardEnvelope {
  format: "mini-deck/clipboard";
  version: 1;
  elements: ElementData[];
}

const idSchema = z.string().min(1).max(64);
const colorSchema = z.string().min(1).max(32);
const finiteNumber = z.number().finite();
const baseElementShape = {
  id: idSchema,
  x: finiteNumber,
  y: finiteNumber,
  width: finiteNumber.min(1).max(20_000),
  height: finiteNumber.min(1).max(20_000),
  rotation: finiteNumber.min(-360_000).max(360_000),
  opacity: finiteNumber.min(0).max(1),
};

export const textElementSchema = z
  .object({
    ...baseElementShape,
    type: z.literal("text"),
    text: z.string().max(MAX_TEXT_LENGTH),
    fontSize: z.number().min(4).max(500),
    fill: colorSchema,
    align: z.enum(["left", "center", "right"]),
  })
  .strict();

export const rectElementSchema = z
  .object({
    ...baseElementShape,
    type: z.literal("rect"),
    fill: colorSchema,
    stroke: colorSchema,
    strokeWidth: z.number().min(0).max(100),
    cornerRadius: z.number().min(0).max(1000),
  })
  .strict();

export const ellipseElementSchema = z
  .object({
    ...baseElementShape,
    type: z.literal("ellipse"),
    fill: colorSchema,
    stroke: colorSchema,
    strokeWidth: z.number().min(0).max(100),
  })
  .strict();

export const arrowElementSchema = z
  .object({
    ...baseElementShape,
    type: z.literal("arrow"),
    stroke: colorSchema,
    strokeWidth: z.number().min(1).max(100),
    flipX: z.boolean(),
    flipY: z.boolean(),
  })
  .strict();

export const imageElementSchema = z
  .object({
    ...baseElementShape,
    type: z.literal("image"),
    assetId: z.string().min(8).max(128),
  })
  .strict();

export const shapeElementSchema = z
  .object({
    ...baseElementShape,
    type: z.literal("shape"),
    shape: z.enum(SHAPE_KINDS),
    fill: colorSchema,
    stroke: colorSchema,
    strokeWidth: z.number().min(0).max(100),
  })
  .strict();

export const lineElementSchema = z
  .object({
    ...baseElementShape,
    type: z.literal("line"),
    stroke: colorSchema,
    strokeWidth: z.number().min(1).max(100),
    flipX: z.boolean(),
    flipY: z.boolean(),
  })
  .strict();

export const elementDataSchema = z.discriminatedUnion("type", [
  textElementSchema,
  rectElementSchema,
  ellipseElementSchema,
  arrowElementSchema,
  imageElementSchema,
  shapeElementSchema,
  lineElementSchema,
]);

export const clipboardEnvelopeSchema = z
  .object({
    format: z.literal("mini-deck/clipboard"),
    version: z.literal(1),
    elements: z.array(elementDataSchema).min(1).max(MAX_CLIPBOARD_ELEMENTS),
  })
  .strict();

export const titleSchema = z.string().trim().min(1).max(MAX_TITLE_LENGTH);

export const participantSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1).max(MAX_PARTICIPANT_NAME),
    color: colorSchema,
  })
  .strict();

export const cursorSchema = z
  .object({
    slideId: idSchema,
    x: finiteNumber,
    y: finiteNumber,
  })
  .strict();

export const selectionSchema = z
  .object({
    slideId: idSchema,
    ids: z.array(idSchema).max(MAX_SELECTION_IDS),
  })
  .strict();

export const awarenessStateSchema = z
  .object({
    user: participantSchema,
    cursor: cursorSchema.nullable(),
    selection: selectionSchema.nullable(),
  })
  .strict();

export const deckMetaSchema = z
  .object({
    schemaVersion: z.number().int().min(1),
    title: titleSchema,
  })
  .strict();
