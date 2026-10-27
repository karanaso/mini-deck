"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import type * as Y from "yjs";

import {
  getDeckTitle,
  getElementOrder,
  getMeta,
  getSlide,
  getSlideData,
  getSlideOrder,
  getSlides,
  type SlideData,
} from "@mini-deck/deck";

export function useDeckTitle(doc: Y.Doc): string {
  const meta = getMeta(doc);
  const subscribe = useCallback(
    (onChange: () => void) => {
      meta.observe(onChange);
      return () => meta.unobserve(onChange);
    },
    [meta],
  );
  const getSnapshot = useCallback(() => getDeckTitle(doc), [doc]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useSlideIds(doc: Y.Doc): string[] {
  const cache = useRef<{ key: string; value: string[] }>({ key: "", value: [] });
  const slides = getSlides(doc);
  const order = getSlideOrder(doc);

  const subscribe = useCallback(
    (onChange: () => void) => {
      slides.observe(onChange);
      order.observe(onChange);
      return () => {
        slides.unobserve(onChange);
        order.unobserve(onChange);
      };
    },
    [slides, order],
  );

  const getSnapshot = useCallback(() => {
    const ids = order.toArray().filter((slideId) => slides.has(slideId));
    const key = ids.join("\u0000");
    if (cache.current.key !== key) cache.current = { key, value: ids };
    return cache.current.value;
  }, [order, slides]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useSlideData(doc: Y.Doc, slideId: string | null): SlideData | null {
  const cache = useRef<{ key: string; value: SlideData | null }>({
    key: "__missing__",
    value: null,
  });
  const slides = getSlides(doc);
  const order = getSlideOrder(doc);
  const slide = slideId ? getSlide(doc, slideId) : undefined;

  const subscribe = useCallback(
    (onChange: () => void) => {
      slides.observe(onChange);
      order.observe(onChange);
      slide?.observeDeep(onChange);
      return () => {
        slides.unobserve(onChange);
        order.unobserve(onChange);
        slide?.unobserveDeep(onChange);
      };
    },
    [slides, order, slide],
  );

  const getSnapshot = useCallback(() => {
    if (!slideId) return null;
    const data = getSlideData(doc, slideId);
    if (!data) {
      if (cache.current.key !== "__missing__") {
        cache.current = { key: "__missing__", value: null };
      }
      return null;
    }
    const key = JSON.stringify(data);
    if (cache.current.key !== key) cache.current = { key, value: data };
    return cache.current.value;
  }, [doc, slideId]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function readElementOrder(doc: Y.Doc, slideId: string): string[] {
  const slide = getSlide(doc, slideId);
  if (!slide) return [];
  return getElementOrder(slide).toArray();
}
