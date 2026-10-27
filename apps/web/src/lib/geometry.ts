import { SLIDE_HEIGHT, SLIDE_WIDTH, type ElementData } from "@mini-deck/deck";

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function fitScale(viewportWidth: number, viewportHeight: number, padding = 48): number {
  return Math.max(
    0.05,
    Math.min(
      (viewportWidth - padding * 2) / SLIDE_WIDTH,
      (viewportHeight - padding * 2) / SLIDE_HEIGHT,
    ),
  );
}

export function slidePoint(
  pointer: Point,
  content: { x: number; y: number; scale: number },
): Point {
  return {
    x: (pointer.x - content.x) / content.scale,
    y: (pointer.y - content.y) / content.scale,
  };
}

export function elementBounds(element: ElementData): Bounds {
  return {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  };
}

export function boundsIntersect(left: Bounds, right: Bounds): boolean {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

export function selectionBounds(
  elements: readonly ElementData[],
): Bounds | null {
  if (elements.length === 0) return null;
  const minX = Math.min(...elements.map((element) => element.x));
  const minY = Math.min(...elements.map((element) => element.y));
  const maxX = Math.max(...elements.map((element) => element.x + element.width));
  const maxY = Math.max(...elements.map((element) => element.y + element.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function nudgeAmount(shift: boolean): number {
  return shift ? 10 : 1;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
