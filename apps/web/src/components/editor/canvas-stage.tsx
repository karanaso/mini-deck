"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type Konva from "konva";
import {
  Arrow,
  Ellipse,
  Group,
  Layer,
  Line,
  Rect,
  Stage,
  Transformer,
  Text as KonvaText,
} from "react-konva";

import { toast } from "sonner";

import {
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  addElement,
  createElementId,
  createTextElement,
  deleteElements,
  MAX_TEXT_LENGTH,
  getShapePoints,
  getSlideData,
  setElementText,
  updateElement,
  type ElementData,
  type Role,
} from "@mini-deck/deck";

import { ElementNode } from "@/components/editor/element-node";
import { useI18n } from "@/components/i18n/locale-provider";
import { useAwarenessStates } from "@/hooks/use-awareness";
import { useSlideData } from "@/hooks/use-deck";
import { useDeckContext } from "@/components/editor/deck-provider";
import {
  boundsIntersect,
  fitScale,
  slidePoint,
  type Point,
} from "@/lib/geometry";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { SHAPE_DEFAULTS, isPolygonTool, shapeLabelKey } from "@/lib/shape-tools";
import { useEditorStore, type EditorTool } from "@/store/editor-store";

interface CanvasStageProps {
  slideId: string;
  role: Role;
}

interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const PADDING = 28;

export function CanvasStage({ slideId, role }: CanvasStageProps) {
  const { t } = useI18n();
  const { doc, provider, undoManager } = useDeckContext();
  const slide = useSlideData(doc, slideId);
  const awarenessEntries = useAwarenessStates(provider);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const elementNodes = useRef(new Map<string, Konva.Group>());
  const cursorThrottle = useRef(0);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const [size, setSize] = useState({ width: 960, height: 540 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    start: Point;
    current: Point;
    tool: EditorTool;
  } | null>(null);
  const [marquee, setMarquee] = useState<{ start: Point; current: Point } | null>(null);

  const zoom = useEditorStore((state) => state.zoom);
  const tool = useEditorStore((state) => state.tool);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const setTool = useEditorStore((state) => state.setTool);
  const selectOnly = useEditorStore((state) => state.selectOnly);
  const toggleSelection = useEditorStore((state) => state.toggleSelection);
  const setSelectedIds = useEditorStore((state) => state.setSelectedIds);
  const clearSelection = useEditorStore((state) => state.clearSelection);

  const editable = role === "editor";
  const scale = fitScale(size.width, size.height, PADDING) * zoom;
  const contentX = (size.width - SLIDE_WIDTH * scale) / 2;
  const contentY = (size.height - SLIDE_HEIGHT * scale) / 2;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({
        width: Math.max(320, entry.contentRect.width),
        height: Math.max(240, entry.contentRect.height),
      });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const registerNode = useCallback((elementId: string, node: Konva.Group | null) => {
    if (node) elementNodes.current.set(elementId, node);
    else elementNodes.current.delete(elementId);
  }, []);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const nodes = selectedIds
      .map((id) => elementNodes.current.get(id))
      .filter((node): node is Konva.Group => Boolean(node));
    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
  }, [selectedIds, slide]);

  useEffect(() => {
    if (!slide) return;
    if (editingId && !slide.elements.some((element) => element.id === editingId)) {
      setEditingId(null);
    }
  }, [editingId, slide]);

  useEffect(() => {
    const awareness = provider?.awareness;
    if (!awareness) return;
    awareness.setLocalStateField("selection", {
      slideId,
      ids: selectedIds,
    });
  }, [provider, selectedIds, slideId]);

  useEffect(() => {
    const awareness = provider?.awareness;
    return () => {
      awareness?.setLocalStateField("cursor", null);
      awareness?.setLocalStateField("selection", null);
    };
  }, [provider, slideId]);

  useEffect(() => {
    if (editingId) {
      requestAnimationFrame(() => textAreaRef.current?.focus());
    }
  }, [editingId]);

  const pointerInSlide = useCallback((): Point | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    return slidePoint(pointer, { x: contentX, y: contentY, scale });
  }, [contentX, contentY, scale]);

  const updateCursor = useCallback(
    (point: Point | null) => {
      const awareness = provider?.awareness;
      if (!awareness) return;
      const now = performance.now();
      if (now - cursorThrottle.current < 40) return;
      cursorThrottle.current = now;
      awareness.setLocalStateField(
        "cursor",
        point ? { slideId, x: point.x, y: point.y } : null,
      );
    },
    [provider, slideId],
  );

  const handleBackgroundDown = useCallback(
    (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (event.target !== stageRef.current) return;
      const point = pointerInSlide();
      if (!point) return;

      if (editable && tool !== "select") {
        if (tool === "text") {
          createTextAt(point);
        } else {
          setDraft({ start: point, current: point, tool });
        }
        return;
      }

      setEditingId(null);
      setMarquee({ start: point, current: point });
    },
    [editable, pointerInSlide, tool],
  );

  const handlePointerMove = useCallback(() => {
    const point = pointerInSlide();
    updateCursor(point);
    if (!point) return;
    if (draft) setDraft((current) => (current ? { ...current, current: point } : null));
    if (marquee) setMarquee((current) => (current ? { ...current, current: point } : null));
  }, [draft, marquee, pointerInSlide, updateCursor]);

  const handlePointerUp = useCallback(() => {
    if (draft) {
      commitDraft(draft);
      setDraft(null);
      return;
    }
    if (marquee) {
      const box = normalizeBox(marquee.start, marquee.current);
      if (box.width > 3 || box.height > 3) {
        const hits =
          slide?.elements.filter((element) =>
            boundsIntersect(
              { x: element.x, y: element.y, width: element.width, height: element.height },
              box,
            ),
          ) ?? [];
        setSelectedIds(hits.map((element) => element.id));
      } else {
        clearSelection();
      }
      setMarquee(null);
    }
  }, [clearSelection, draft, marquee, setSelectedIds, slide]);

  const commitDraft = useCallback(
    (value: NonNullable<typeof draft>) => {
      if (!slide || !editable) return;
      const box = normalizeBox(value.start, value.current);
      if (value.tool === "arrow" || value.tool === "line") {
        if (Math.abs(value.current.x - value.start.x) < 4 && Math.abs(value.current.y - value.start.y) < 4) {
          return;
        }
        const common = {
          id: createId(),
          x: Math.min(value.start.x, value.current.x),
          y: Math.min(value.start.y, value.current.y),
          width: Math.max(8, Math.abs(value.current.x - value.start.x)),
          height: Math.max(8, Math.abs(value.current.y - value.start.y)),
          rotation: 0,
          opacity: 1,
          stroke: "#111827",
          strokeWidth: 6,
          flipX: value.current.x < value.start.x,
          flipY: value.current.y < value.start.y,
        };
        const element: ElementData =
          value.tool === "line"
            ? { ...common, type: "line" }
            : { ...common, type: "arrow" };
        try {
          addElement(doc, slideId, element);
          selectOnly(element.id);
          undoManager.stopCapturing();
        } catch {
          toast.error(t("errors.deck.addElement"));
          return;
        }
      } else if (
        value.tool === "rect" ||
        value.tool === "ellipse" ||
        isPolygonTool(value.tool)
      ) {
        if (box.width < 8 || box.height < 8) return;
        let element: ElementData;
        if (value.tool === "rect") {
          element = {
            id: createId(),
            type: "rect",
            ...box,
            rotation: 0,
            opacity: 1,
            fill: "#dbeafe",
            stroke: "#2563eb",
            strokeWidth: 4,
            cornerRadius: 12,
          };
        } else if (value.tool === "ellipse") {
          element = {
            id: createId(),
            type: "ellipse",
            ...box,
            rotation: 0,
            opacity: 1,
            fill: "#dcfce7",
            stroke: "#16a34a",
            strokeWidth: 4,
          };
        } else {
          const defaults = SHAPE_DEFAULTS[value.tool];
          element = {
            id: createId(),
            type: "shape",
            shape: value.tool,
            ...box,
            rotation: 0,
            opacity: 1,
            fill: defaults.fill,
            stroke: defaults.stroke,
            strokeWidth: 4,
          };
        }
        try {
          addElement(doc, slideId, element);
          selectOnly(element.id);
          undoManager.stopCapturing();
        } catch {
          toast.error(t("errors.deck.addElement"));
          return;
        }
      }
      setTool("select");
    },
    [doc, editable, selectOnly, setTool, slide, slideId, undoManager],
  );

  const createTextAt = useCallback(
    (point: Point) => {
      if (!editable) return;
      try {
        const id = createTextElement(doc, slideId, {
          x: point.x,
          y: point.y,
          width: 520,
          height: 110,
          text: "",
        });
        selectOnly(id);
        setEditingId(id);
        setTool("select");
        undoManager.stopCapturing();
      } catch {
        toast.error(t("errors.deck.addText"));
      }
    },
    [doc, editable, selectOnly, setTool, slideId, undoManager],
  );

  const moveElement = useCallback(
    (elementId: string, centerX: number, centerY: number) => {
      if (!slide || !editable) return;
      const source = slide.elements.find((element) => element.id === elementId);
      if (!source) return;
      const newX = centerX - source.width / 2;
      const newY = centerY - source.height / 2;
      const deltaX = newX - source.x;
      const deltaY = newY - source.y;
      const ids =
        selectedIds.includes(elementId) && selectedIds.length > 1
          ? selectedIds
          : [elementId];
      for (const id of ids) {
        const element = slide.elements.find((candidate) => candidate.id === id);
        if (!element) continue;
        updateElement(doc, slideId, id, {
          x: element.x + deltaX,
          y: element.y + deltaY,
        });
      }
      undoManager.stopCapturing();
    },
    [doc, editable, selectedIds, slide, slideId, undoManager],
  );

  const finishTransform = useCallback(() => {
    const transformer = transformerRef.current;
    if (!transformer || !editable) return;
    for (const node of transformer.nodes()) {
      const id = node.id();
      const width = Math.max(1, node.width() * node.scaleX());
      const height = Math.max(1, node.height() * node.scaleY());
      updateElement(doc, slideId, id, {
        x: node.x() - width / 2,
        y: node.y() - height / 2,
        width,
        height,
        rotation: node.rotation(),
      });
      node.scaleX(1);
      node.scaleY(1);
    }
    undoManager.stopCapturing();
  }, [doc, editable, slideId, undoManager]);

  const editingElement = editingId
    ? slide?.elements.find((element) => element.id === editingId)
    : null;

  const remote = useMemo(() => {
    if (!slide) return [];
    return awarenessEntries
      .filter((entry) => entry.clientId !== provider?.awareness?.clientID)
      .filter((entry) => entry.cursor?.slideId === slideId || entry.selection?.slideId === slideId);
  }, [awarenessEntries, provider, slide, slideId]);

  if (!slide) {
    return <div ref={containerRef} className="relative h-full w-full" />;
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-slate-200/60"
      data-testid="canvas-stage"
      data-scale={scale}
      data-content-x={contentX}
      data-content-y={contentY}
    >
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        onMouseDown={handleBackgroundDown}
        onTouchStart={handleBackgroundDown}
        onMouseMove={handlePointerMove}
        onTouchMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTouchEnd={handlePointerUp}
        onMouseLeave={() => {
          updateCursor(null);
          setMarquee(null);
        }}
      >
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
          >
            <Rect
              x={0}
              y={0}
              width={SLIDE_WIDTH}
              height={SLIDE_HEIGHT}
              fill={slide.background || "#ffffff"}
              shadowColor="#0f172a"
              shadowBlur={24}
              shadowOpacity={0.12}
              shadowOffsetY={6}
              listening={false}
            />
            {slide.elements.map((element) => (
              <ElementNode
                key={element.id}
                element={element}
                selectable
                draggable={editable}
                hidden={editingId === element.id}
                onSelect={(id, additive) => {
                  if (additive) toggleSelection(id);
                  else selectOnly(id);
                }}
                onMove={moveElement}
                onEditText={(id) => {
                  if (editable) setEditingId(id);
                }}
                register={registerNode}
              />
            ))}
            {draft ? (
              <DraftPreview draft={draft} scale={scale} />
            ) : null}
          </Group>
        </Layer>

        <Layer>
          <Transformer
            ref={transformerRef}
            resizeEnabled={editable}
            rotateEnabled={editable}
            borderStroke="#4f46e5"
            borderStrokeWidth={1.5}
            anchorStroke="#4f46e5"
            anchorFill="#ffffff"
            anchorSize={9}
            anchorCornerRadius={3}
            enabledAnchors={
              editable
                ? [
                    "top-left",
                    "top-center",
                    "top-right",
                    "middle-left",
                    "middle-right",
                    "bottom-left",
                    "bottom-center",
                    "bottom-right",
                  ]
                : []
            }
            onTransformEnd={finishTransform}
          />
        </Layer>

        <Layer listening={false}>
          {marquee ? (
            <Rect
              {...toScreenBox(normalizeBox(marquee.start, marquee.current), {
                x: contentX,
                y: contentY,
                scale,
              })}
              fill="rgba(79,70,229,0.08)"
              stroke="#4f46e5"
              strokeWidth={1.5}
              dash={[6, 4]}
            />
          ) : null}

          {remote.map((entry) =>
            entry.selection?.slideId === slideId
              ? entry.selection.ids.map((elementId) => {
                  const element = slide.elements.find(
                    (candidate) => candidate.id === elementId,
                  );
                  if (!element) return null;
                  const box = toScreenBox(
                    {
                      x: element.x,
                      y: element.y,
                      width: element.width,
                      height: element.height,
                    },
                    { x: contentX, y: contentY, scale },
                  );
                  return (
                    <Rect
                      key={`${entry.clientId}-${elementId}`}
                      {...box}
                      stroke={entry.user.color}
                      strokeWidth={2}
                      dash={[5, 3]}
                      cornerRadius={4}
                    />
                  );
                })
              : null,
          )}

          {remote.map((entry) => {
            if (!entry.cursor || entry.cursor.slideId !== slideId) return null;
            const x = contentX + entry.cursor.x * scale;
            const y = contentY + entry.cursor.y * scale;
            return (
              <Group key={`cursor-${entry.clientId}`} x={x} y={y}>
                <Line
                  points={[0, 0, 0, 18, 5, 13, 10, 22, 14, 20, 9, 11, 16, 10]}
                  closed
                  fill={entry.user.color}
                  stroke="#ffffff"
                  strokeWidth={1}
                />
                <Rect
                  x={16}
                  y={18}
                  width={Math.max(54, entry.user.name.length * 7 + 16)}
                  height={22}
                  fill={entry.user.color}
                  cornerRadius={5}
                />
                <KonvaText
                  x={23}
                  y={23}
                  text={entry.user.name}
                  fontSize={11}
                  fontFamily="Inter"
                  fill="#ffffff"
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>

      {editingElement && editingElement.type === "text" ? (
        <textarea
          ref={textAreaRef}
          data-testid="text-editor"
          className="absolute z-20 resize-none overflow-hidden rounded-sm border-2 border-dashed border-indigo-500 bg-white/20 p-0 outline-none"
          style={{
            left: contentX + (editingElement.x + editingElement.width / 2) * scale,
            top: contentY + (editingElement.y + editingElement.height / 2) * scale,
            width: editingElement.width * scale,
            height: editingElement.height * scale,
            transform: `translate(-50%, -50%) rotate(${editingElement.rotation}deg)`,
            fontSize: editingElement.fontSize * scale,
            lineHeight: 1.2,
            fontFamily: "Inter",
            color: editingElement.fill,
            textAlign: editingElement.align,
            caretColor: editingElement.fill,
            whiteSpace: "pre-wrap",
          }}
          value={editingElement.text}
          maxLength={MAX_TEXT_LENGTH}
          onChange={(event) => {
            updateYTextValue(event.target.value);
          }}
          onBlur={() => {
            const latest = getSlideData(doc, slideId)?.elements.find(
              (element) => element.id === editingElement.id,
            );
            if (latest?.type === "text" && !latest.text.trim()) {
              deleteElements(doc, slideId, [editingElement.id]);
              clearSelection();
            }
            undoManager.stopCapturing();
            setEditingId(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.currentTarget.blur();
            }
          }}
        />
      ) : null}

      <div className="sr-only" data-testid="remote-presence">
        {remote.map((entry) => (
          <span
            key={entry.clientId}
            data-testid={`remote-${entry.clientId}`}
            data-name={entry.user.name}
            data-color={entry.user.color}
            data-cursor-slide={entry.cursor?.slideId ?? ""}
            data-cursor-x={entry.cursor?.x ?? ""}
            data-cursor-y={entry.cursor?.y ?? ""}
            data-selection-slide={entry.selection?.slideId ?? ""}
            data-selection-ids={entry.selection?.ids.join(",") ?? ""}
          >
            {entry.user.name}
          </span>
        ))}
      </div>

      <div className="sr-only" data-testid="element-list">
        {slide.elements.map((element) => (
          <button
            key={element.id}
            type="button"
            data-testid={`element-${element.id}`}
            data-element-type={element.type}
            data-element-text={element.type === "text" ? element.text : undefined}
            data-element-x={element.x}
            data-element-y={element.y}
            data-element-width={element.width}
            data-element-height={element.height}
            data-element-rotation={element.rotation}
            data-element-shape={element.type === "shape" ? element.shape : undefined}
            data-element-fill={elementFill(element)}
            data-element-stroke={elementStroke(element)}
            data-element-font-size={element.type === "text" ? element.fontSize : undefined}
            data-element-align={element.type === "text" ? element.align : undefined}
            aria-label={t("a11y.selectElement", {
              type: t(elementTypeKey(element)),
            })}
            onClick={() => selectOnly(element.id)}
          >
            {element.type}
          </button>
        ))}
      </div>
    </div>
  );

  function updateYTextValue(value: string): void {
    if (!editingElement) return;
    setElementText(doc, slideId, editingElement.id, value);
  }
}

function elementFill(element: ElementData): string | undefined {
  return "fill" in element ? element.fill : undefined;
}

function elementStroke(element: ElementData): string | undefined {
  return "stroke" in element ? element.stroke : undefined;
}

function elementTypeKey(element: ElementData): MessageKey {
  switch (element.type) {
    case "text":
      return "editor.style.types.text";
    case "rect":
      return "editor.style.types.rect";
    case "ellipse":
      return "editor.style.types.ellipse";
    case "arrow":
      return "editor.style.types.arrow";
    case "image":
      return "editor.style.types.image";
    case "shape":
      return shapeLabelKey(element.shape);
    case "line":
      return "editor.style.types.line";
  }
}

function DraftPreview({
  draft,
  scale,
}: {
  draft: { start: Point; current: Point; tool: EditorTool };
  scale: number;
}) {
  const box = normalizeBox(draft.start, draft.current);
  if (draft.tool === "arrow") {
    return (
      <Arrow
        points={[
          draft.start.x,
          draft.start.y,
          draft.current.x,
          draft.current.y,
        ]}
        stroke="#4f46e5"
        fill="#4f46e5"
        strokeWidth={4 / scale}
        pointerLength={14 / scale}
        pointerWidth={14 / scale}
        dash={[6 / scale, 4 / scale]}
      />
    );
  }
  if (draft.tool === "line") {
    return (
      <Line
        points={[
          draft.start.x,
          draft.start.y,
          draft.current.x,
          draft.current.y,
        ]}
        stroke="#4f46e5"
        strokeWidth={4 / scale}
        lineCap="round"
        dash={[6 / scale, 4 / scale]}
      />
    );
  }
  if (isPolygonTool(draft.tool)) {
    return (
      <Line
        points={getShapePoints(draft.tool, box.width, box.height)}
        x={box.x}
        y={box.y}
        closed
        stroke="#4f46e5"
        strokeWidth={2 / scale}
        dash={[6 / scale, 4 / scale]}
      />
    );
  }
  if (draft.tool === "ellipse") {
    return (
      <Ellipse
        x={box.x + box.width / 2}
        y={box.y + box.height / 2}
        radiusX={box.width / 2}
        radiusY={box.height / 2}
        stroke="#4f46e5"
        strokeWidth={2 / scale}
        dash={[6 / scale, 4 / scale]}
      />
    );
  }
  return (
    <Rect
      {...box}
      stroke="#4f46e5"
      strokeWidth={2 / scale}
      dash={[6 / scale, 4 / scale]}
    />
  );
}

function normalizeBox(start: Point, current: Point): SelectionBox {
  return {
    x: Math.min(start.x, current.x),
    y: Math.min(start.y, current.y),
    width: Math.abs(current.x - start.x),
    height: Math.abs(current.y - start.y),
  };
}

function toScreenBox(
  box: SelectionBox,
  content: { x: number; y: number; scale: number },
): SelectionBox {
  return {
    x: content.x + box.x * content.scale,
    y: content.y + box.y * content.scale,
    width: box.width * content.scale,
    height: box.height * content.scale,
  };
}

function createId(): string {
  return createElementId();
}
