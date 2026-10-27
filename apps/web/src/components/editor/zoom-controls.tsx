"use client";

import { Maximize2, Minus, Plus } from "lucide-react";

import { useI18n } from "@/components/i18n/locale-provider";
import { useEditorStore } from "@/store/editor-store";

export function ZoomControls() {
  const { t } = useI18n();
  const zoom = useEditorStore((state) => state.zoom);
  const setZoom = useEditorStore((state) => state.setZoom);

  return (
    <div className="absolute left-4 top-4 z-20 flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur">
      <button
        type="button"
        onClick={() => setZoom(zoom - 0.15)}
        aria-label={t("editor.zoom.out")}
        data-testid="zoom-out"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-10 text-center text-[10px] font-semibold tabular-nums text-slate-600">
        {Math.round(zoom * 100)}%
      </span>
      <button
        type="button"
        onClick={() => setZoom(zoom + 0.15)}
        aria-label={t("editor.zoom.in")}
        data-testid="zoom-in"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setZoom(1)}
        aria-label={t("editor.zoom.fit")}
        data-testid="zoom-fit"
        className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
