"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import {
  addElement,
  createElementId,
  createTextElement,
  deleteElements,
  getSlideData,
  preparePastedElements,
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
} from "@mini-deck/deck";

import { useDeckContext } from "@/components/editor/deck-provider";
import { useI18n } from "@/components/i18n/locale-provider";
import { isTypingTarget } from "@/hooks/use-editor-shortcuts";
import { messageForError } from "@/lib/api-error";
import { parseClipboardEvent, writeElementsToClipboard } from "@/lib/clipboard";
import { maxImageMb, uploadImage, validateImageFile } from "@/lib/upload";
import { useEditorStore } from "@/store/editor-store";

export function useEditorClipboard() {
  const { t } = useI18n();
  const { deckId, token, doc, role, undoManager } = useDeckContext();
  const currentSlideId = useEditorStore((state) => state.currentSlideId);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const presentationOpen = useEditorStore((state) => state.presentationOpen);
  const setSelectedIds = useEditorStore((state) => state.setSelectedIds);

  useEffect(() => {
    function copyHandler(event: ClipboardEvent) {
      if (presentationOpen || isTypingTarget(event.target)) return;
      if (role !== "editor" || !currentSlideId || selectedIds.length === 0) return;
      const slide = getSlideData(doc, currentSlideId);
      const elements = slide?.elements.filter((element) => selectedIds.includes(element.id));
      if (!elements || elements.length === 0) return;
      event.preventDefault();
      writeElementsToClipboard(event, elements);
    }

    function cutHandler(event: ClipboardEvent) {
      if (presentationOpen || isTypingTarget(event.target)) return;
      if (role !== "editor" || !currentSlideId || selectedIds.length === 0) return;
      const slide = getSlideData(doc, currentSlideId);
      const elements = slide?.elements.filter((element) => selectedIds.includes(element.id));
      if (!elements || elements.length === 0) return;
      event.preventDefault();
      writeElementsToClipboard(event, elements);
      deleteElements(doc, currentSlideId, elements.map((element) => element.id));
      setSelectedIds([]);
      undoManager.stopCapturing();
      toast.success(t("editor.cut"));
    }

    function pasteHandler(event: ClipboardEvent) {
      if (presentationOpen || isTypingTarget(event.target)) return;
      if (!currentSlideId) return;
      const parsed = parseClipboardEvent(event);
      if (!parsed.elements && !parsed.image && !parsed.text) return;
      event.preventDefault();

      if (role !== "editor") {
        toast.info(t("editor.readOnly"));
        return;
      }

      if (parsed.elements) {
        try {
          const prepared = preparePastedElements(parsed.elements, 24);
          const ids: string[] = [];
          for (const element of prepared) {
            addElement(doc, currentSlideId, element);
            ids.push(element.id);
          }
          setSelectedIds(ids);
          undoManager.stopCapturing();
          toast.success(
            ids.length === 1
              ? t("editor.pastedElement")
              : t("editor.pastedElements", { count: ids.length }),
          );
        } catch (error) {
          const message = messageForError(error, "editor.pasteError");
          toast.error(t(message.key, message.params));
        }
        return;
      }

      if (parsed.image) {
        void (async () => {
          const invalid = validateImageFile(parsed.image!);
          if (invalid) {
            toast.error(t(invalid, { maxMb: maxImageMb() }));
            return;
          }
          try {
            const asset = await uploadImage(deckId, token, parsed.image!);
            const width = Math.min(1100, Math.max(180, asset.width));
            const height = Math.max(80, (asset.height / asset.width) * width);
            const id = createElementId();
            addElement(doc, currentSlideId, {
              id,
              type: "image",
              x: (SLIDE_WIDTH - width) / 2,
              y: (SLIDE_HEIGHT - height) / 2,
              width,
              height,
              rotation: 0,
              opacity: 1,
              assetId: asset.id,
            });
            setSelectedIds([id]);
            undoManager.stopCapturing();
            toast.success(t("editor.pastedImage"));
          } catch (error) {
            const message = messageForError(error, "editor.pasteImageError");
            toast.error(t(message.key, message.params));
          }
        })();
        return;
      }

      if (parsed.text) {
        const text = parsed.text.slice(0, 10_000);
        if (!text.trim()) return;
        try {
          const id = createTextElement(doc, currentSlideId, {
            x: 520,
            y: 430,
            width: 880,
            height: 220,
            text,
            fontSize: 42,
          });
          setSelectedIds([id]);
          undoManager.stopCapturing();
          toast.success(t("editor.pastedText"));
        } catch (error) {
          const message = messageForError(error, "editor.pasteTextError");
          toast.error(t(message.key, message.params));
        }
      }
    }

    document.addEventListener("copy", copyHandler);
    document.addEventListener("cut", cutHandler);
    document.addEventListener("paste", pasteHandler);
    return () => {
      document.removeEventListener("copy", copyHandler);
      document.removeEventListener("cut", cutHandler);
      document.removeEventListener("paste", pasteHandler);
    };
  }, [
    currentSlideId,
    deckId,
    doc,
    presentationOpen,
    role,
    selectedIds,
    setSelectedIds,
    t,
    token,
    undoManager,
  ]);
}
