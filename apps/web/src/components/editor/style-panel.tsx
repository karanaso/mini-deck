"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowUpToLine,
  Copy,
  MoveDown,
  MoveUp,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  bringForward,
  bringToFront,
  deleteElements,
  duplicateElements,
  sendBackward,
  sendToBack,
  updateElement,
  type ElementData,
  type TextAlign,
} from "@mini-deck/deck";

import { useDeckContext } from "@/components/editor/deck-provider";
import { useI18n } from "@/components/i18n/locale-provider";
import { useSlideData } from "@/hooks/use-deck";
import { messageForError } from "@/lib/api-error";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { shapeLabelKey } from "@/lib/shape-tools";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";

export function StylePanel({ slideId }: { slideId: string }) {
  const { t, tCount } = useI18n();
  const { doc, undoManager } = useDeckContext();
  const slide = useSlideData(doc, slideId);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const setSelectedIds = useEditorStore((state) => state.setSelectedIds);
  const clearSelection = useEditorStore((state) => state.clearSelection);

  const selected =
    slide?.elements.filter((element) => selectedIds.includes(element.id)) ?? [];
  const single = selected.length === 1 ? selected[0] : null;

  function patch(patchValue: Record<string, unknown>) {
    if (!single) return;
    updateElement(doc, slideId, single.id, patchValue);
    undoManager.stopCapturing();
  }

  function duplicate() {
    try {
      const ids = duplicateElements(doc, slideId, selectedIds);
      undoManager.stopCapturing();
      if (ids.length > 0) {
        setSelectedIds(ids);
        toast.success(
          t(ids.length === 1 ? "editor.style.elementDuplicated" : "editor.style.elementsDuplicated"),
        );
      }
    } catch (error) {
      const message = messageForError(error, "editor.style.duplicateError");
      toast.error(t(message.key, message.params));
    }
  }

  function remove() {
    try {
      deleteElements(doc, slideId, selectedIds);
      undoManager.stopCapturing();
      clearSelection();
    } catch (error) {
      const message = messageForError(error, "editor.style.deleteError");
      toast.error(t(message.key, message.params));
    }
  }

  function arrange(action: () => void) {
    action();
    undoManager.stopCapturing();
  }

  const alignLabels: Record<TextAlign, MessageKey> = {
    left: "editor.style.alignLeft",
    center: "editor.style.alignCenter",
    right: "editor.style.alignRight",
  };

  return (
    <aside
      className="flex h-full w-[248px] shrink-0 flex-col border-l border-slate-200 bg-white"
      data-testid="style-panel"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            {t("editor.style.heading")}
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            {selected.length === 0
              ? t("editor.style.nothingSelected")
              : selected.length === 1
                ? t(labelKeyFor(selected[0]))
                : tCount("editor.style.selectedElements", selected.length)}
          </p>
        </div>
      </div>

      {selected.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
            <MoveUp className="h-4 w-4" />
          </div>
          <p className="mt-3 text-xs font-medium text-slate-600">
            {t("editor.style.selectElement")}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-slate-600">
            {t("editor.style.selectElementHelp")}
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {single ? (
            <div className="space-y-5">
              {hasFill(single) && (
                <ColorControl
                  label={
                    single.type === "text"
                      ? t("editor.style.textColor")
                      : t("editor.style.fill")
                  }
                  value={single.fill}
                  onChange={(value) => patch({ fill: value })}
                  testId="style-fill"
                />
              )}

              {hasStroke(single) && (
                <ColorControl
                  label={t("editor.style.stroke")}
                  value={single.stroke}
                  onChange={(value) => patch({ stroke: value })}
                  testId="style-stroke"
                />
              )}

              {hasStrokeWidth(single) && (
                <RangeControl
                  label={t("editor.style.strokeWidth")}
                  value={single.strokeWidth}
                  min={0}
                  max={24}
                  step={1}
                  onChange={(value) => patch({ strokeWidth: value })}
                  testId="style-stroke-width"
                />
              )}

              {hasCornerRadius(single) ? (
                <RangeControl
                  label={t("editor.style.cornerRadius")}
                  value={single.cornerRadius}
                  min={0}
                  max={120}
                  step={1}
                  onChange={(value) => patch({ cornerRadius: value })}
                  testId="style-corner-radius"
                />
              ) : null}

              {single.type === "text" ? (
                <>
                  <RangeControl
                    label={t("editor.style.fontSize")}
                    value={single.fontSize}
                    min={8}
                    max={220}
                    step={1}
                    onChange={(value) => patch({ fontSize: value })}
                    testId="style-font-size"
                  />
                  <div>
                    <p className="mb-2 text-[11px] font-medium text-slate-600">
                      {t("editor.style.alignment")}
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {(
                        [
                          ["left", AlignLeft],
                          ["center", AlignCenter],
                          ["right", AlignRight],
                        ] as const
                      ).map(([align, Icon]) => (
                        <button
                          key={align}
                          type="button"
                          onClick={() => patch({ align: align as TextAlign })}
                          aria-label={t(alignLabels[align])}
                          aria-pressed={single.align === align}
                          data-testid={`style-align-${align}`}
                          className={cn(
                            "flex h-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50",
                            single.align === align &&
                              "border-indigo-300 bg-indigo-50 text-indigo-700",
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}

              <RangeControl
                label={t("editor.style.rotation")}
                value={Math.round(single.rotation)}
                min={-180}
                max={180}
                step={1}
                suffix="°"
                onChange={(value) => patch({ rotation: value })}
                testId="style-rotation"
              />

              <RangeControl
                label={t("editor.style.opacity")}
                value={Math.round(single.opacity * 100)}
                min={10}
                max={100}
                step={1}
                suffix="%"
                onChange={(value) => patch({ opacity: value / 100 })}
                testId="style-opacity"
              />
            </div>
          ) : null}

          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="mb-2 text-[11px] font-medium text-slate-600">
              {t("editor.style.arrange")}
            </p>
            <div className="grid grid-cols-4 gap-1">
              <IconButton
                label={t("editor.style.sendToBack")}
                onClick={() => arrange(() => sendToBack(doc, slideId, selectedIds))}
                testId="arrange-back"
              >
                <ArrowDownToLine className="h-4 w-4" />
              </IconButton>
              <IconButton
                label={t("editor.style.sendBackward")}
                onClick={() => arrange(() => sendBackward(doc, slideId, selectedIds))}
                testId="arrange-backward"
              >
                <MoveDown className="h-4 w-4" />
              </IconButton>
              <IconButton
                label={t("editor.style.bringForward")}
                onClick={() => arrange(() => bringForward(doc, slideId, selectedIds))}
                testId="arrange-forward"
              >
                <MoveUp className="h-4 w-4" />
              </IconButton>
              <IconButton
                label={t("editor.style.bringToFront")}
                onClick={() => arrange(() => bringToFront(doc, slideId, selectedIds))}
                testId="arrange-front"
              >
                <ArrowUpToLine className="h-4 w-4" />
              </IconButton>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={duplicate}
                data-testid="duplicate-element"
                className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                <Copy className="h-3.5 w-3.5" />
                {t("common.duplicate")}
              </button>
              <button
                type="button"
                onClick={remove}
                data-testid="delete-element"
                className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-red-200 text-[11px] font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function ColorControl({
  label,
  value,
  onChange,
  testId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  testId: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-medium text-slate-600">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase text-slate-600">{value}</span>
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          data-testid={testId}
          className="h-7 w-9 cursor-pointer rounded-md border border-slate-200 bg-white p-0.5"
        />
      </span>
    </label>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  onChange,
  testId,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
  testId: string;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-slate-600">{label}</span>
        <span className="text-[10px] tabular-nums text-slate-600">
          {Math.round(value)}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        data-testid={testId}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-600"
      />
    </label>
  );
}

function IconButton({
  label,
  onClick,
  testId,
  children,
}: {
  label: string;
  onClick: () => void;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      data-testid={testId}
      className="flex h-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      {children}
    </button>
  );
}

function hasFill(
  element: ElementData,
): element is Extract<ElementData, { fill: string }> {
  return "fill" in element;
}

function hasStroke(
  element: ElementData,
): element is Extract<ElementData, { stroke: string }> {
  return "stroke" in element;
}

function hasStrokeWidth(
  element: ElementData,
): element is Extract<ElementData, { strokeWidth: number }> {
  return "strokeWidth" in element;
}

function hasCornerRadius(
  element: ElementData,
): element is Extract<ElementData, { cornerRadius: number }> {
  return "cornerRadius" in element;
}

function labelKeyFor(element: ElementData): MessageKey {
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
