"use client";

import { useState } from "react";
import { ChevronDown, FileImage, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { getDeckData } from "@mini-deck/deck";

import { useDeckContext } from "@/components/editor/deck-provider";
import { useI18n } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { messageForError } from "@/lib/api-error";
import { exportDeckPdf, exportSlidePng } from "@/lib/export";
import { useEditorStore } from "@/store/editor-store";

interface ExportProgress {
  kind: "PNG" | "PDF";
  completed: number;
  total: number;
}

export function ExportMenu() {
  const { t } = useI18n();
  const { doc } = useDeckContext();
  const currentSlideId = useEditorStore((state) => state.currentSlideId);
  const [progress, setProgress] = useState<ExportProgress | null>(null);

  async function exportPng() {
    const data = getDeckData(doc);
    if (data.slides.length === 0) return;
    const index = Math.max(
      0,
      data.slides.findIndex((slide) => slide.id === currentSlideId),
    );
    setProgress({ kind: "PNG", completed: 0, total: 1 });
    try {
      await exportSlidePng(data.title, index, data.slides[index]);
      toast.success(t("editor.export.pngDownloaded"));
    } catch (error) {
      const message = messageForError(error, "editor.export.pngError");
      toast.error(t(message.key, message.params));
    } finally {
      await new Promise((resolve) => setTimeout(resolve, 250));
      setProgress(null);
    }
  }

  async function exportPdf() {
    const data = getDeckData(doc);
    if (data.slides.length === 0) return;
    setProgress({ kind: "PDF", completed: 0, total: data.slides.length });
    try {
      await exportDeckPdf(data.title, data.slides, (completed, total) => {
        setProgress({ kind: "PDF", completed, total });
      });
      toast.success(t("editor.export.pdfDownloaded"));
    } catch (error) {
      const message = messageForError(error, "editor.export.pdfError");
      toast.error(t(message.key, message.params));
    } finally {
      await new Promise((resolve) => setTimeout(resolve, 250));
      setProgress(null);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" data-testid="export-menu" disabled={Boolean(progress)}>
            {progress ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {t("common.export")}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{t("common.download")}</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => void exportPng()} data-testid="export-png">
            <FileImage className="h-4 w-4 text-slate-600" />
            {t("editor.export.currentSlidePng")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void exportPdf()} data-testid="export-pdf">
            <FileText className="h-4 w-4 text-slate-600" />
            {t("editor.export.allSlidesPdf")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {progress ? (
        <div
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-lg"
          data-testid="export-progress"
          role="status"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
          {progress.total > 1
            ? t("editor.export.exportingWithProgress", {
                kind: progress.kind,
                completed: progress.completed,
                total: progress.total,
              })
            : `${t("editor.export.exporting", { kind: progress.kind })}…`}
        </div>
      ) : null}
    </>
  );
}
