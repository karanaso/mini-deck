"use client";

import { useEffect, useRef, useState } from "react";
import {
  Copy,
  FilePlus2,
  GripVertical,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  LastSlideError,
  createSlide,
  deleteSlide,
  duplicateSlide,
  reorderSlide,
  type Role,
} from "@mini-deck/deck";

import { useDeckContext } from "@/components/editor/deck-provider";
import { useI18n } from "@/components/i18n/locale-provider";
import { useSlideData, useSlideIds } from "@/hooks/use-deck";
import { renderSlideToDataUrl } from "@/lib/render-slide";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";

export function SlideRail({ role }: { role: Role }) {
  const { t } = useI18n();
  const { doc, undoManager } = useDeckContext();
  const slideIds = useSlideIds(doc);
  const currentSlideId = useEditorStore((state) => state.currentSlideId);
  const setCurrentSlide = useEditorStore((state) => state.setCurrentSlide);
  const editable = role === "editor";
  const [dragSlideId, setDragSlideId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function addSlide() {
    try {
      const id = createSlide(doc, currentSlideId ?? undefined);
      setCurrentSlide(id);
      undoManager.stopCapturing();
    } catch {
      toast.error(t("editor.addSlideError"));
    }
  }

  function duplicateCurrent() {
    if (!currentSlideId) return;
    try {
      const id = duplicateSlide(doc, currentSlideId);
      setCurrentSlide(id);
      undoManager.stopCapturing();
    } catch {
      toast.error(t("editor.duplicateSlideError"));
    }
  }

  function removeCurrent() {
    if (!currentSlideId) return;
    const index = slideIds.indexOf(currentSlideId);
    try {
      deleteSlide(doc, currentSlideId);
      const remaining = slideIds.filter((id) => id !== currentSlideId);
      setCurrentSlide(remaining[Math.min(index, remaining.length - 1)]);
      undoManager.stopCapturing();
      toast.success(t("editor.slideDeleted"));
    } catch (error) {
      if (error instanceof LastSlideError) {
        toast.error(t("editor.lastSlideError"));
      } else {
        toast.error(t("editor.deleteSlideError"));
      }
    }
  }

  return (
    <aside className="flex h-full w-[188px] shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center justify-between px-3 pb-2 pt-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
          {t("editor.slides")}
        </span>
        <span className="text-[11px] tabular-nums text-slate-600">{slideIds.length}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-3">
        <div className="flex flex-col gap-2">
          {slideIds.map((slideId, index) => (
            <div
              key={slideId}
              draggable={editable}
              onDragStart={(event) => {
                if (!editable) return;
                setDragSlideId(slideId);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", slideId);
              }}
              onDragOver={(event) => {
                if (!editable || !dragSlideId) return;
                event.preventDefault();
                setDragOverIndex(index);
              }}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={(event) => {
                if (!editable) return;
                event.preventDefault();
                const dragged = dragSlideId ?? event.dataTransfer.getData("text/plain");
                if (dragged) {
                  reorderSlide(doc, dragged, index);
                  undoManager.stopCapturing();
                }
                setDragSlideId(null);
                setDragOverIndex(null);
              }}
              onDragEnd={() => {
                setDragSlideId(null);
                setDragOverIndex(null);
              }}
              className={cn(
                "group relative rounded-xl border p-1 transition-all",
                currentSlideId === slideId
                  ? "border-indigo-500 bg-indigo-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300",
                dragOverIndex === index && dragSlideId && "ring-2 ring-indigo-400",
              )}
              data-testid={`slide-${index}`}
              data-current={currentSlideId === slideId ? "true" : "false"}
            >
              <button
                type="button"
                onClick={() => setCurrentSlide(slideId)}
                className="block w-full rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label={t("editor.goToSlide", { number: index + 1 })}
              >
                <SlideThumbnail slideId={slideId} />
                <div className="flex items-center justify-between px-1 pt-1">
                  <span
                    className={cn(
                      "text-[10px] font-semibold tabular-nums",
                      currentSlideId === slideId ? "text-indigo-700" : "text-slate-600",
                    )}
                  >
                    {index + 1}
                  </span>
                  {editable ? (
                    <GripVertical className="h-3 w-3 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
                  ) : null}
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>

      {editable ? (
        <div className="grid grid-cols-3 gap-1 border-t border-slate-200 p-2">
          <RailButton label={t("editor.addSlide")} onClick={addSlide}>
            <FilePlus2 className="h-4 w-4" />
          </RailButton>
          <RailButton label={t("editor.duplicateSlide")} onClick={duplicateCurrent}>
            <Copy className="h-4 w-4" />
          </RailButton>
          <RailButton
            label={t("editor.deleteSlide")}
            onClick={removeCurrent}
            disabled={slideIds.length <= 1}
          >
            <Trash2 className="h-4 w-4" />
          </RailButton>
        </div>
      ) : null}
    </aside>
  );
}

function RailButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function SlideThumbnail({ slideId }: { slideId: string }) {
  const { doc } = useDeckContext();
  const slide = useSlideData(doc, slideId);
  const [url, setUrl] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!slide) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      renderSlideToDataUrl(slide, { outputWidth: 320, outputHeight: 180 })
        .then(setUrl)
        .catch(() => setUrl(null));
    }, 220);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [slide]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-md border border-slate-200 bg-white">
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" draggable={false} />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-slate-50">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-300" />
        </div>
      )}
    </div>
  );
}
