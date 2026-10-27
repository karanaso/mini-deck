import { isShapeKind, type ShapeKind } from "@mini-deck/deck";

import type { MessageKey } from "@/lib/i18n/dictionaries";
import type { EditorTool, ShapeTool } from "@/store/editor-store";

const SHAPE_LABEL_KEYS: Record<ShapeTool, MessageKey> = {
  triangle: "editor.shapes.triangle",
  diamond: "editor.shapes.diamond",
  parallelogram: "editor.shapes.parallelogram",
  trapezoid: "editor.shapes.trapezoid",
  pentagon: "editor.shapes.pentagon",
  hexagon: "editor.shapes.hexagon",
  star: "editor.shapes.star",
  line: "editor.shapes.line",
};

export interface ShapeToolOption {
  value: ShapeTool;
  labelKey: MessageKey;
}

export const SHAPE_TOOL_OPTIONS: readonly ShapeToolOption[] = [
  { value: "triangle", labelKey: SHAPE_LABEL_KEYS.triangle },
  { value: "diamond", labelKey: SHAPE_LABEL_KEYS.diamond },
  { value: "parallelogram", labelKey: SHAPE_LABEL_KEYS.parallelogram },
  { value: "trapezoid", labelKey: SHAPE_LABEL_KEYS.trapezoid },
  { value: "pentagon", labelKey: SHAPE_LABEL_KEYS.pentagon },
  { value: "hexagon", labelKey: SHAPE_LABEL_KEYS.hexagon },
  { value: "star", labelKey: SHAPE_LABEL_KEYS.star },
  { value: "line", labelKey: SHAPE_LABEL_KEYS.line },
];

export const SHAPE_DEFAULTS: Record<ShapeKind, { fill: string; stroke: string }> = {
  triangle: { fill: "#fee2e2", stroke: "#dc2626" },
  diamond: { fill: "#fef3c7", stroke: "#d97706" },
  parallelogram: { fill: "#dbeafe", stroke: "#2563eb" },
  trapezoid: { fill: "#dcfce7", stroke: "#16a34a" },
  pentagon: { fill: "#ede9fe", stroke: "#7c3aed" },
  hexagon: { fill: "#cffafe", stroke: "#0891b2" },
  star: { fill: "#fce7f3", stroke: "#db2777" },
};

export function isPolygonTool(tool: EditorTool): tool is ShapeKind {
  return isShapeKind(tool);
}

export function shapeLabelKey(shape: ShapeKind): MessageKey {
  return SHAPE_LABEL_KEYS[shape];
}

export function shapeToolLabelKey(tool: ShapeTool): MessageKey {
  return SHAPE_LABEL_KEYS[tool];
}
