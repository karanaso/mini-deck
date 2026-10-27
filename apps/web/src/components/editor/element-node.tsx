"use client";

import type Konva from "konva";
import {
  Arrow,
  Ellipse,
  Group,
  Image as KonvaImage,
  Line,
  Rect,
  Text,
} from "react-konva";

import { getLineEndpoints, getShapePoints, type ElementData } from "@mini-deck/deck";

import { useImage } from "@/hooks/use-image";

interface ElementNodeProps {
  element: ElementData;
  selectable?: boolean;
  draggable?: boolean;
  hidden?: boolean;
  onSelect?: (elementId: string, additive: boolean) => void;
  onMove?: (elementId: string, centerX: number, centerY: number) => void;
  onEditText?: (elementId: string) => void;
  register?: (elementId: string, node: Konva.Group | null) => void;
}

export function ElementNode({
  element,
  selectable = false,
  draggable = false,
  hidden = false,
  onSelect,
  onMove,
  onEditText,
  register,
}: ElementNodeProps) {
  const common = {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
    offsetX: element.width / 2,
    offsetY: element.height / 2,
    width: element.width,
    height: element.height,
    rotation: element.rotation,
    opacity: element.opacity,
    visible: !hidden,
    draggable,
    listening: selectable,
    name: "element",
    id: element.id,
  };

  return (
    <Group
      {...common}
      ref={(node) => register?.(element.id, node)}
      onClick={(event) => {
        if (!selectable) return;
        event.cancelBubble = true;
        onSelect?.(element.id, Boolean(event.evt.shiftKey));
      }}
      onTap={(event) => {
        if (!selectable) return;
        event.cancelBubble = true;
        onSelect?.(element.id, false);
      }}
      onDragEnd={(event) => {
        if (!draggable) return;
        onMove?.(element.id, event.target.x(), event.target.y());
      }}
      onDblClick={(event) => {
        if (!draggable || element.type !== "text") return;
        event.cancelBubble = true;
        onEditText?.(element.id);
      }}
      onDblTap={(event) => {
        if (!draggable || element.type !== "text") return;
        event.cancelBubble = true;
        onEditText?.(element.id);
      }}
    >
      {renderElement(element, selectable)}
    </Group>
  );
}

function renderElement(element: ElementData, listening: boolean) {
  switch (element.type) {
    case "text":
      return (
        <Text
          text={element.text || " "}
          width={element.width}
          height={element.height}
          fontSize={element.fontSize}
          fontFamily="Inter"
          fill={element.fill}
          align={element.align}
          wrap="word"
          verticalAlign="top"
          lineHeight={1.2}
          listening={listening}
        />
      );
    case "rect":
      return (
        <Rect
          width={element.width}
          height={element.height}
          fill={element.fill}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
          cornerRadius={element.cornerRadius}
          listening={listening}
        />
      );
    case "ellipse":
      return (
        <Ellipse
          x={element.width / 2}
          y={element.height / 2}
          radiusX={element.width / 2}
          radiusY={element.height / 2}
          fill={element.fill}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
          listening={listening}
        />
      );
    case "arrow": {
      const startX = element.flipX ? element.width : 0;
      const startY = element.flipY ? element.height : 0;
      const endX = element.flipX ? 0 : element.width;
      const endY = element.flipY ? 0 : element.height;
      const pointer = Math.max(16, element.strokeWidth * 4);
      return (
        <Arrow
          points={[startX, startY, endX, endY]}
          stroke={element.stroke}
          fill={element.stroke}
          strokeWidth={element.strokeWidth}
          pointerLength={pointer}
          pointerWidth={pointer}
          lineCap="round"
          listening={listening}
        />
      );
    }
    case "image":
      return <ImageElement element={element} listening={listening} />;
    case "shape":
      return (
        <Line
          points={getShapePoints(element.shape, element.width, element.height)}
          closed
          fill={element.fill}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
          lineJoin="round"
          listening={listening}
        />
      );
    case "line": {
      const [startX, startY, endX, endY] = getLineEndpoints(
        element.width,
        element.height,
        element.flipX,
        element.flipY,
      );
      return (
        <Line
          points={[startX, startY, endX, endY]}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
          lineCap="round"
          hitStrokeWidth={Math.max(20, element.strokeWidth)}
          listening={listening}
        />
      );
    }
  }
}

function ImageElement({
  element,
  listening,
}: {
  element: Extract<ElementData, { type: "image" }>;
  listening: boolean;
}) {
  const image = useImage(`/api/assets/${element.assetId}`);
  if (!image) {
    return (
      <Rect
        width={element.width}
        height={element.height}
        fill="#f1f5f9"
        stroke="#cbd5e1"
        strokeWidth={2}
        dash={[8, 6]}
        listening={listening}
      />
    );
  }
  return (
    <KonvaImage
      image={image}
      width={element.width}
      height={element.height}
      listening={listening}
    />
  );
}
