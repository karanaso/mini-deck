"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";

import { useSlideData, useSlideIds } from "@/hooks/use-deck";
import { useDeckContext } from "@/components/editor/deck-provider";
import { useI18n } from "@/components/i18n/locale-provider";
import { SlidePreview } from "@/components/editor/slide-preview";
import { useEditorStore } from "@/store/editor-store";

export function PresentationOverlay() {
  const { t } = useI18n();
  const { doc } = useDeckContext();
  const slideIds = useSlideIds(doc);
  const currentSlideId = useEditorStore((state) => state.currentSlideId);
  const open = useEditorStore((state) => state.presentationOpen);
  const setOpen = useEditorStore((state) => state.setPresentationOpen);
  const setCurrentSlide = useEditorStore((state) => state.setCurrentSlide);
  const initialIndex = Math.max(0, slideIds.indexOf(currentSlideId ?? ""));
  const [index, setIndex] = useState(initialIndex);
  const activeSlideId = slideIds[index] ?? slideIds[0] ?? null;
  const slide = useSlideData(doc, activeSlideId);

  useEffect(() => {
    if (!open) return;
    toast.dismiss();
    setIndex(Math.max(0, slideIds.indexOf(currentSlideId ?? "")));
    const element = document.documentElement;
    void element.requestFullscreen?.().catch(() => undefined);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      } else if (event.key === "ArrowRight" || event.key === " " || event.key === "PageDown") {
        event.preventDefault();
        setIndex((value) => Math.min(slideIds.length - 1, value + 1));
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        setIndex((value) => Math.max(0, value - 1));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, slideIds.length]);

  useEffect(() => {
    if (slideIds.length === 0) return;
    setIndex((value) => Math.min(value, slideIds.length - 1));
  }, [slideIds.length]);

  const counter = useMemo(
    () => `${slideIds.length === 0 ? 0 : index + 1} / ${slideIds.length}`,
    [index, slideIds.length],
  );

  if (!open || !slide) return null;

  function close() {
    const active = slideIds[index];
    if (active) setCurrentSlide(active);
    setOpen(false);
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-slate-950"
      data-testid="presentation"
    >
      <div className="flex items-center justify-between px-5 py-3 text-white/70">
        <span className="text-xs font-medium tracking-wide">{counter}</span>
        <button
          type="button"
          onClick={close}
          className="rounded-lg p-2 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label={t("presentation.exit")}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6">
        <SlidePreview slide={slide} className="h-full w-full" padding={16} />
        <button
          type="button"
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
          disabled={index === 0}
          className="absolute left-5 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur transition-colors hover:bg-white/20 disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label={t("presentation.previousSlide")}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={() => setIndex((value) => Math.min(slideIds.length - 1, value + 1))}
          disabled={index >= slideIds.length - 1}
          className="absolute right-5 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur transition-colors hover:bg-white/20 disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label={t("presentation.nextSlide")}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
      <div className="bg-slate-950 px-5 py-3 text-center text-[11px] text-white/70">
        {t("presentation.help")}
      </div>
    </div>
  );
}
