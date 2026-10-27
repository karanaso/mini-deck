"use client";

import { getShapePoints } from "@mini-deck/deck";

import type { ShapeTool } from "@/store/editor-store";

export function ShapePreview({
  shape,
  className = "h-4 w-4",
}: {
  shape: ShapeTool;
  className?: string;
}) {
  if (shape === "line") {
    return (
      <svg
        viewBox="0 0 16 16"
        className={className}
        aria-hidden="true"
        focusable="false"
      >
        <line
          x1="2"
          y1="14"
          x2="14"
          y2="2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const points = getShapePoints(shape, 14, 14).join(" ");

  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <polygon
        points={points}
        transform="translate(1 1)"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
