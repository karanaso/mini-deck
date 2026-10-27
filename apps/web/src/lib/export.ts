import { PDFDocument } from "pdf-lib";

import type { SlideData } from "@mini-deck/deck";

import { AppError } from "@/lib/app-error";
import { renderSlideToCanvas } from "./render-slide";

export function sanitizeFilename(title: string): string {
  const sanitized = title
    .trim()
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\u0000-\u001f]/gu, "-")
    .replace(/\s+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 80);
  return sanitized || "deck";
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else {
        reject(
          new AppError(
            "errors.export.encode",
            "Could not encode the slide image",
          ),
        );
      }
    }, "image/png");
  });
}

export async function exportSlidePng(
  deckTitle: string,
  slideIndex: number,
  slide: SlideData,
): Promise<void> {
  const canvas = await renderSlideToCanvas(slide, {
    outputWidth: 1920,
    outputHeight: 1080,
  });
  const blob = await canvasToBlob(canvas);
  downloadBlob(
    blob,
    `${sanitizeFilename(deckTitle)}-slide-${slideIndex + 1}.png`,
  );
}

export async function exportDeckPdf(
  deckTitle: string,
  slides: readonly SlideData[],
  onProgress?: (completed: number, total: number) => void,
): Promise<void> {
  const pdf = await PDFDocument.create();
  const pageWidth = 960;
  const pageHeight = 540;

  for (let index = 0; index < slides.length; index += 1) {
    onProgress?.(index, slides.length);
    const canvas = await renderSlideToCanvas(slides[index], {
      outputWidth: 1920,
      outputHeight: 1080,
    });
    const dataUrl = canvas.toDataURL("image/png");
    const image = await pdf.embedPng(dataUrl);
    const page = pdf.addPage([pageWidth, pageHeight]);
    page.drawImage(image, { x: 0, y: 0, width: pageWidth, height: pageHeight });
  }

  onProgress?.(slides.length, slides.length);
  const bytes = await pdf.save();
  downloadBlob(
    new Blob([bytes as BlobPart], { type: "application/pdf" }),
    `${sanitizeFilename(deckTitle)}.pdf`,
  );
}
