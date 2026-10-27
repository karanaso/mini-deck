import { describe, expect, it } from "vitest";

import {
  boundsIntersect,
  elementBounds,
  fitScale,
  nudgeAmount,
  selectionBounds,
  slidePoint,
} from "./geometry";

describe("geometry", () => {
  it("fits a 16:9 slide into a viewport with padding", () => {
    expect(fitScale(1920, 1080, 0)).toBe(1);
    expect(fitScale(960, 540, 0)).toBe(0.5);
    expect(fitScale(1000, 800, 40)).toBeCloseTo(920 / 1920);
    expect(fitScale(100, 100, 48)).toBeGreaterThanOrEqual(0.05);
  });

  it("converts stage points to slide coordinates", () => {
    expect(slidePoint({ x: 210, y: 120 }, { x: 10, y: 20, scale: 0.5 })).toEqual({
      x: 400,
      y: 200,
    });
  });

  it("detects intersections and calculates selection bounds", () => {
    expect(
      boundsIntersect(
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 90, y: 90, width: 50, height: 50 },
      ),
    ).toBe(true);
    expect(
      boundsIntersect(
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 200, y: 200, width: 50, height: 50 },
      ),
    ).toBe(false);

    const elements = [
      {
        id: "a",
        type: "rect" as const,
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        rotation: 0,
        opacity: 1,
        fill: "#fff",
        stroke: "#000",
        strokeWidth: 1,
        cornerRadius: 0,
      },
      {
        id: "b",
        type: "rect" as const,
        x: 200,
        y: 100,
        width: 40,
        height: 40,
        rotation: 0,
        opacity: 1,
        fill: "#fff",
        stroke: "#000",
        strokeWidth: 1,
        cornerRadius: 0,
      },
    ];
    expect(elementBounds(elements[0])).toMatchObject({ width: 100 });
    expect(selectionBounds(elements)).toEqual({ x: 10, y: 20, width: 230, height: 120 });
    expect(selectionBounds([])).toBeNull();
  });

  it("uses one unit of nudge, or ten with shift", () => {
    expect(nudgeAmount(false)).toBe(1);
    expect(nudgeAmount(true)).toBe(10);
  });
});
