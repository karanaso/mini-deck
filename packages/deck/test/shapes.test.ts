import { describe, expect, it } from "vitest";

import {
  SHAPE_KINDS,
  getLineEndpoints,
  getShapePoints,
  type ShapeKind,
} from "../src/index.js";

const POINT_COUNTS: Record<ShapeKind, number> = {
  triangle: 3,
  diamond: 4,
  parallelogram: 4,
  trapezoid: 4,
  pentagon: 5,
  hexagon: 6,
  star: 10,
};

describe("shape geometry", () => {
  it("returns the expected point count for every shape", () => {
    for (const shape of SHAPE_KINDS) {
      expect(getShapePoints(shape, 200, 100)).toHaveLength(
        POINT_COUNTS[shape] * 2,
      );
    }
  });

  it("normalizes every shape to fill its bounding box", () => {
    const width = 320;
    const height = 180;

    for (const shape of SHAPE_KINDS) {
      const points = getShapePoints(shape, width, height);
      const xs = points.filter((_, index) => index % 2 === 0);
      const ys = points.filter((_, index) => index % 2 === 1);

      expect(Math.min(...xs)).toBeCloseTo(0, 6);
      expect(Math.max(...xs)).toBeCloseTo(width, 6);
      expect(Math.min(...ys)).toBeCloseTo(0, 6);
      expect(Math.max(...ys)).toBeCloseTo(height, 6);
    }
  });

  it("alternates star outer and inner radii", () => {
    const size = 200;
    const points = getShapePoints("star", size, size);
    const center = size / 2;
    const radii = Array.from({ length: points.length / 2 }, (_, index) =>
      Math.hypot(points[index * 2] - center, points[index * 2 + 1] - center),
    );

    for (let index = 0; index < radii.length; index += 2) {
      expect(radii[index]).toBeGreaterThan(radii[index + 1]);
    }
    expect(radii).toHaveLength(10);
  });

  it("returns finite, in-bounds points for zero and tiny boxes", () => {
    for (const shape of SHAPE_KINDS) {
      for (const [width, height] of [
        [0, 0],
        [1, 1],
        [0.5, 2],
      ]) {
        const points = getShapePoints(shape, width, height);
        expect(points.every(Number.isFinite)).toBe(true);
        expect(points.filter((_, index) => index % 2 === 0).every((x) => x >= 0 && x <= width)).toBe(
          true,
        );
        expect(points.filter((_, index) => index % 2 === 1).every((y) => y >= 0 && y <= height)).toBe(
          true,
        );
      }
    }
  });

  it("derives line endpoints from direction flags", () => {
    expect(getLineEndpoints(100, 60, false, false)).toEqual([0, 0, 100, 60]);
    expect(getLineEndpoints(100, 60, true, false)).toEqual([100, 0, 0, 60]);
    expect(getLineEndpoints(100, 60, false, true)).toEqual([0, 60, 100, 0]);
    expect(getLineEndpoints(100, 60, true, true)).toEqual([100, 60, 0, 0]);
  });
});
