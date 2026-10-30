import { describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";

import type { SlideData } from "@mini-deck/deck";

const { renderMock } = vi.hoisted(() => ({ renderMock: vi.fn() }));

vi.mock("@/lib/render-slide", () => ({
  renderSlideToCanvas: renderMock,
}));

import { buildDeckPdf } from "@/lib/export";

const PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP9sAAAAASUVORK5CYII=";

function slide(transition: SlideData["transition"]): SlideData {
  return {
    id: "slide-1",
    background: "#ffffff",
    transition,
    elements: [
      {
        id: "text-1",
        type: "text",
        x: 100,
        y: 100,
        width: 400,
        height: 120,
        rotation: 0,
        opacity: 1,
        text: "Hello",
        fontSize: 48,
        fill: "#111827",
        align: "left",
      },
    ],
  };
}

describe("buildDeckPdf", () => {
  it("produces identical pages for identical content with different transitions", async () => {
    renderMock.mockResolvedValue({
      toDataURL: () => PNG_DATA_URL,
    });

    const withoutTransition = await buildDeckPdf([slide("none")]);
    const withTransition = await buildDeckPdf([slide("zoom")]);

    expect(Buffer.from(withTransition).equals(Buffer.from(withoutTransition))).toBe(
      true,
    );
    const pdf = await PDFDocument.load(withTransition);
    expect(pdf.getPageCount()).toBe(1);
    expect(renderMock).toHaveBeenCalledTimes(2);
  });
});
