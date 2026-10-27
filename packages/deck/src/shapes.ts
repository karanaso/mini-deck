import type { ShapeKind } from "./types.js";

type Point = readonly [number, number];

function regularPolygon(sides: number): Point[] {
  return Array.from({ length: sides }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / sides;
    return [Math.cos(angle), Math.sin(angle)] as const;
  });
}

function starPolygon(points: number, innerRatio: number): Point[] {
  return Array.from({ length: points * 2 }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI) / points;
    const radius = index % 2 === 0 ? 1 : innerRatio;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius] as const;
  });
}

function unitPoints(shape: ShapeKind): Point[] {
  switch (shape) {
    case "triangle":
      return [
        [0.5, 0],
        [1, 1],
        [0, 1],
      ];
    case "diamond":
      return [
        [0.5, 0],
        [1, 0.5],
        [0.5, 1],
        [0, 0.5],
      ];
    case "parallelogram":
      return [
        [0.25, 0],
        [1, 0],
        [0.75, 1],
        [0, 1],
      ];
    case "trapezoid":
      return [
        [0.25, 0],
        [0.75, 0],
        [1, 1],
        [0, 1],
      ];
    case "pentagon":
      return regularPolygon(5);
    case "hexagon":
      return regularPolygon(6);
    case "star":
      return starPolygon(5, 0.4);
  }
}

/**
 * Returns a flat Konva-compatible point list for a closed shape.
 * Points are normalized to exactly fill the element's bounding box.
 */
export function getShapePoints(
  shape: ShapeKind,
  width: number,
  height: number,
): number[] {
  const points = unitPoints(shape);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const safeWidth = Math.max(0, width);
  const safeHeight = Math.max(0, height);

  return points.flatMap(([x, y]) => [
    ((x - minX) / spanX) * safeWidth,
    ((y - minY) / spanY) * safeHeight,
  ]);
}

/**
 * Returns [startX, startY, endX, endY] for a straight line inside its
 * bounding box. Direction uses the same flip flags as arrows.
 */
export function getLineEndpoints(
  width: number,
  height: number,
  flipX: boolean,
  flipY: boolean,
): [number, number, number, number] {
  const startX = flipX ? width : 0;
  const startY = flipY ? height : 0;
  const endX = flipX ? 0 : width;
  const endY = flipY ? 0 : height;
  return [startX, startY, endX, endY];
}
