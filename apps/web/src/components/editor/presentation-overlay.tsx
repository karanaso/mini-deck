"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";

import type { SlideTransition } from "@mini-deck/deck";

import { useSlideData, useSlideIds } from "@/hooks/use-deck";
import { useDeckContext } from "@/components/editor/deck-provider";
import { useI18n } from "@/components/i18n/locale-provider";
import { SlidePreview } from "@/components/editor/slide-preview";
import { useEditorStore } from "@/store/editor-store";

export const TRANSITION_DURATION_MS = 380;

type Direction = "forward" | "backward";

interface TransitionAnimation {
  from: number;
  to: number;
  direction: Direction;
  transition: Exclude<SlideTransition, "none">;
}

function isAnimatedTransition(
  transition: SlideTransition,
): transition is Exclude<SlideTransition, "none"> {
  return transition !== "none";
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);

  return reduced;
}

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
  const [settledIndex, setSettledIndex] = useState(initialIndex);
  const [animation, setAnimation] = useState<TransitionAnimation | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const incomingSlide = useSlideData(doc, slideIds[index] ?? null);
  const outgoingSlide = useSlideData(doc, slideIds[settledIndex] ?? null);
  const transition = incomingSlide?.transition ?? "none";

  useEffect(() => {
    if (!open) return;
    toast.dismiss();
    const start = Math.max(0, slideIds.indexOf(currentSlideId ?? ""));
    setIndex(start);
    setSettledIndex(start);
    setAnimation(null);
    const element = document.documentElement;
    void element.requestFullscreen?.().catch(() => undefined);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      } else if (
        event.key === "ArrowRight" ||
        event.key === " " ||
        event.key === "PageDown"
      ) {
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
    setSettledIndex((value) => Math.min(value, slideIds.length - 1));
  }, [slideIds.length]);

  useLayoutEffect(() => {
    if (!open || index === settledIndex) return;

    if (!isAnimatedTransition(transition) || reducedMotion) {
      setSettledIndex(index);
      setAnimation(null);
      return;
    }

    setAnimation({
      from: settledIndex,
      to: index,
      direction: index > settledIndex ? "forward" : "backward",
      transition,
    });
    const timer = window.setTimeout(() => {
      setSettledIndex(index);
      setAnimation(null);
    }, TRANSITION_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [index, open, reducedMotion, settledIndex, transition]);

  const counter = useMemo(
    () => `${slideIds.length === 0 ? 0 : index + 1} / ${slideIds.length}`,
    [index, slideIds.length],
  );

  const close = useCallback(() => {
    const active = slideIds[index];
    if (active) setCurrentSlide(active);
    setOpen(false);
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
  }, [index, setCurrentSlide, setOpen, slideIds]);

  if (!open || !outgoingSlide) return null;

  const direction = animation?.direction ?? "forward";
  const activeTransition = animation?.transition ?? transition;
  const outgoing = animation ? outgoingSlide : null;
  const incoming = animation ? incomingSlide : outgoingSlide;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-slate-950"
      data-testid="presentation"
      data-animating={animation ? "true" : "false"}
      data-transition={activeTransition}
      data-direction={direction}
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
        <div
          className="presentation-viewport relative h-full w-full"
          data-testid="presentation-viewport"
          data-animating={animation ? "true" : "false"}
          data-transition={activeTransition}
          data-direction={direction}
        >
          {animation && outgoing ? (
            <div
              className={`presentation-layer absolute inset-0 ${
                animation.transition === "push"
                  ? `presentation-leave-push-${animation.direction}`
                  : "presentation-leave"
              }`}
              data-testid="presentation-outgoing"
              data-slide-id={outgoing.id}
            >
              <SlidePreview slide={outgoing} className="h-full w-full" padding={16} />
            </div>
          ) : null}
          {incoming ? (
            <div
              className={`presentation-layer absolute inset-0 ${
                animation
                  ? animation.transition === "push"
                    ? `presentation-enter-push-${animation.direction}`
                    : `presentation-enter-${animation.transition}`
                  : ""
              }`}
              data-testid="presentation-incoming"
              data-slide-id={incoming.id}
            >
              <SlidePreview slide={incoming} className="h-full w-full" padding={16} />
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
          disabled={index === 0}
          className="absolute left-5 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur transition-colors hover:bg-white/20 disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label={t("presentation.previousSlide")}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={() =>
            setIndex((value) => Math.min(slideIds.length - 1, value + 1))
          }
          disabled={index >= slideIds.length - 1}
          className="absolute right-5 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur transition-colors hover:bg-white/20 disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-white/50"
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
