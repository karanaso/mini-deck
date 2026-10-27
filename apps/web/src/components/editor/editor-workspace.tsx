"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

import { useDeckContext } from "@/components/editor/deck-provider";
import { useI18n } from "@/components/i18n/locale-provider";
import { PresentationOverlay } from "@/components/editor/presentation-overlay";
import { SlideRail } from "@/components/editor/slide-rail";
import { StylePanel } from "@/components/editor/style-panel";
import { Toolbar } from "@/components/editor/toolbar";
import { TopBar } from "@/components/editor/top-bar";
import { ZoomControls } from "@/components/editor/zoom-controls";
import { useSlideIds } from "@/hooks/use-deck";
import { useEditorClipboard } from "@/hooks/use-editor-clipboard";
import { useEditorShortcuts } from "@/hooks/use-editor-shortcuts";
import { useEditorStore } from "@/store/editor-store";

const CanvasStage = dynamic(
  () => import("@/components/editor/canvas-stage").then((module) => module.CanvasStage),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-slate-200/60">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
      </div>
    ),
  },
);

export function EditorWorkspace() {
  const { t } = useI18n();
  const { role, doc, synced, status } = useDeckContext();
  const slideIds = useSlideIds(doc);
  const currentSlideId = useEditorStore((state) => state.currentSlideId);
  const setCurrentSlide = useEditorStore((state) => state.setCurrentSlide);
  const reset = useEditorStore((state) => state.reset);
  const lastIndex = useRef(0);
  const resetOnce = useRef(false);

  useEffect(() => {
    if (!resetOnce.current) {
      resetOnce.current = true;
      reset();
    }
  }, [reset]);

  useEffect(() => {
    if (slideIds.length === 0) return;
    const index = currentSlideId ? slideIds.indexOf(currentSlideId) : -1;
    if (index >= 0) {
      lastIndex.current = index;
      return;
    }
    const fallback =
      slideIds[Math.min(lastIndex.current, slideIds.length - 1)] ?? slideIds[0];
    if (fallback) setCurrentSlide(fallback);
  }, [currentSlideId, setCurrentSlide, slideIds]);

  useEditorShortcuts(slideIds);
  useEditorClipboard();

  const slideId =
    currentSlideId && slideIds.includes(currentSlideId) ? currentSlideId : slideIds[0] ?? null;

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden bg-[#f1f5f9]"
      data-testid="editor-workspace"
      data-role={role}
    >
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <div className="hidden h-full md:flex">
          <SlideRail role={role} />
        </div>
        <main className="relative min-w-0 flex-1">
          {slideId ? (
            <CanvasStage slideId={slideId} role={role} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-600">
              {t("deckShell.loadingSlides")}
            </div>
          )}
          <ZoomControls />
          {role === "editor" && slideId ? <Toolbar slideId={slideId} /> : null}

          {!synced ? (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-slate-100/95 backdrop-blur-sm">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              <p className="text-sm font-medium text-slate-600">
                {status === "disconnected"
                  ? t("deckShell.reconnecting")
                  : t("deckShell.syncing")}
              </p>
              <p className="text-xs text-slate-600">
                {t("deckShell.syncHint")}
              </p>
            </div>
          ) : null}
        </main>
        {role === "editor" ? (
          <div className="hidden h-full lg:flex">
            <StylePanel slideId={slideId ?? ""} />
          </div>
        ) : null}
      </div>
      <PresentationOverlay />
    </div>
  );
}
