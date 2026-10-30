// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

import type { SlideData } from "@mini-deck/deck";

vi.mock("react-konva", () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Group: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Rect: () => null,
}));

vi.mock("@/components/editor/element-node", () => ({
  ElementNode: () => null,
}));

import { SlidePreview } from "@/components/editor/slide-preview";

const slide: SlideData = {
  id: "slide-1",
  background: "#ffffff",
  transition: "zoom",
  elements: [],
};

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("static slide surfaces", () => {
  it("renders slide content without transition state", () => {
    const { container } = render(<SlidePreview slide={slide} />);

    expect(container.querySelector('[class*="presentation-"]')).toBeNull();
    expect(container.querySelector("[data-transition]")).toBeNull();
    expect(container.querySelector('[data-testid="slide-preview"]')).not.toBeNull();
  });
});
