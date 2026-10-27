"use client";

import { useEffect, useRef, useState } from "react";
import { Group, Layer, Rect, Stage } from "react-konva";

import {
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  type SlideData,
} from "@mini-deck/deck";

import { ElementNode } from "@/components/editor/element-node";
import { fitScale } from "@/lib/geometry";

export function SlidePreview({
  slide,
  className = "",
  padding = 24,
  background = "#020617",
}: {
  slide: SlideData;
  className?: string;
  padding?: number;
  background?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 960, height: 540 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({
        width: Math.max(240, entry.contentRect.width),
        height: Math.max(135, entry.contentRect.height),
      });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const scale = fitScale(size.width, size.height, padding);
  const contentX = (size.width - SLIDE_WIDTH * scale) / 2;
  const contentY = (size.height - SLIDE_HEIGHT * scale) / 2;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ background }}
      data-testid="slide-preview"
    >
      <Stage width={size.width} height={size.height} listening={false}>
        <Layer>
          <Group
            x={contentX}
            y={contentY}
            scaleX={scale}
            scaleY={scale}
            clipX={0}
            clipY={0}
            clipWidth={SLIDE_WIDTH}
            clipHeight={SLIDE_HEIGHT}
            listening={false}
          >
            <Rect
              x={0}
              y={0}
              width={SLIDE_WIDTH}
              height={SLIDE_HEIGHT}
              fill={slide.background || "#ffffff"}
              listening={false}
            />
            {slide.elements.map((element) => (
              <ElementNode
                key={element.id}
                element={element}
                selectable={false}
                draggable={false}
              />
            ))}
          </Group>
        </Layer>
      </Stage>
    </div>
  );
}
