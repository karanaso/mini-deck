"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import {
  deleteElements,
  duplicateElements,
  getSlideData,
  nudgeElements,
} from "@mini-deck/deck";

import { useDeckContext } from "@/components/editor/deck-provider";
import { useI18n } from "@/components/i18n/locale-provider";
import { messageForError } from "@/lib/api-error";
import { useEditorStore, type EditorTool } from "@/store/editor-store";

export function useEditorShortcuts(slideIds: readonly string[]) {
  const { t } = useI18n();
  const {
    doc,
    role,
    undo,
    redo,
    canUndo,
    canRedo,
    undoManager,
  } = useDeckContext();
  const currentSlideId = useEditorStore((state) => state.currentSlideId);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const presentationOpen = useEditorStore((state) => state.presentationOpen);
  const setCurrentSlide = useEditorStore((state) => state.setCurrentSlide);
  const setTool = useEditorStore((state) => state.setTool);
  const clearSelection = useEditorStore((state) => state.clearSelection);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (presentationOpen || isTypingTarget(event.target)) return;

      const modifier = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      const slide = currentSlideId ? getSlideData(doc, currentSlideId) : null;

      if (modifier && key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          if (canRedo) redo();
        } else if (canUndo) {
          undo();
        }
        return;
      }

      if (modifier && key === "d") {
        event.preventDefault();
        if (role === "editor" && slide) {
          try {
            const ids = duplicateElements(doc, slide.id, selectedIds);
            undoManager.stopCapturing();
            if (ids.length > 0) {
              useEditorStore.getState().setSelectedIds(ids);
              toast.success(t("editor.duplicated"));
            }
          } catch (error) {
            const message = messageForError(error, "editor.style.duplicateError");
            toast.error(t(message.key, message.params));
          }
        }
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedIds.length === 0) return;
        event.preventDefault();
        if (role !== "editor" || !slide) {
          toast.info(t("editor.readOnly"));
          return;
        }
        deleteElements(doc, slide.id, selectedIds);
        undoManager.stopCapturing();
        clearSelection();
        return;
      }

      if (event.key === "Escape") {
        clearSelection();
        setTool("select");
        return;
      }

      if (event.key === "PageDown" || (modifier && key === "arrowright")) {
        event.preventDefault();
        const index = currentSlideId ? slideIds.indexOf(currentSlideId) : -1;
        const next = slideIds[Math.min(slideIds.length - 1, index + 1)];
        if (next) setCurrentSlide(next);
        return;
      }
      if (event.key === "PageUp" || (modifier && key === "arrowleft")) {
        event.preventDefault();
        const index = currentSlideId ? slideIds.indexOf(currentSlideId) : 0;
        const previous = slideIds[Math.max(0, index - 1)];
        if (previous) setCurrentSlide(previous);
        return;
      }

      if (!modifier && role === "editor") {
        const toolKeys: Record<string, EditorTool> = {
          v: "select",
          t: "text",
          r: "rect",
          o: "ellipse",
          a: "arrow",
          l: "line",
        };
        if (toolKeys[key]) {
          event.preventDefault();
          setTool(toolKeys[key]);
          return;
        }
      }

      if (event.key.startsWith("Arrow") && selectedIds.length > 0) {
        if (role !== "editor" || !slide) return;
        event.preventDefault();
        const amount = event.shiftKey ? 10 : 1;
        const delta =
          event.key === "ArrowLeft"
            ? [-amount, 0]
            : event.key === "ArrowRight"
              ? [amount, 0]
              : event.key === "ArrowUp"
                ? [0, -amount]
                : [0, amount];
        nudgeElements(doc, slide.id, selectedIds, delta[0], delta[1]);
        undoManager.stopCapturing();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    canRedo,
    canUndo,
    clearSelection,
    currentSlideId,
    doc,
    presentationOpen,
    redo,
    role,
    selectedIds,
    setCurrentSlide,
    setTool,
    slideIds,
    t,
    undo,
    undoManager,
  ]);
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    target.isContentEditable
  );
}
