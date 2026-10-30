// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";

const state = vi.hoisted(() => ({
  transitions: {} as Record<string, "none" | "fade" | "push" | "zoom">,
  reducedMotion: false,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/components/editor/deck-provider", () => ({
  useDeckContext: () => ({ doc: {} }),
}));

vi.mock("@/hooks/use-deck", () => ({
  useSlideIds: () => ["s1", "s2", "s3", "s4"],
  useSlideData: (_doc: unknown, slideId: string | null) =>
    slideId
      ? {
          id: slideId,
          background: "#ffffff",
          transition: state.transitions[slideId] ?? "none",
          elements: [],
        }
      : null,
}));

vi.mock("@/components/editor/slide-preview", () => ({
  SlidePreview: ({ slide }: { slide: { id: string } }) => (
    <div data-testid="slide-preview" data-slide-id={slide.id} />
  ),
}));

import { PresentationOverlay } from "@/components/editor/presentation-overlay";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { useEditorStore } from "@/store/editor-store";

function setup(
  transitions: Record<string, "none" | "fade" | "push" | "zoom">,
  currentSlideId = "s1",
) {
  state.transitions = transitions;
  useEditorStore.setState({
    presentationOpen: true,
    currentSlideId,
    selectedIds: [],
  });
  render(
    <LocaleProvider initialLocale="en">
      <PresentationOverlay />
    </LocaleProvider>,
  );
}

function press(key: string) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
}

beforeEach(() => {
  state.reducedMotion = false;
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: state.reducedMotion,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
  useEditorStore.getState().reset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("PresentationOverlay transitions", () => {
  it("plays a forward push with outgoing and incoming layers", () => {
    vi.useFakeTimers();
    setup({ s1: "push", s2: "push" });
    press("ArrowRight");

    const presentation = screen.getByTestId("presentation");
    expect(presentation).toHaveAttribute("data-animating", "true");
    expect(presentation).toHaveAttribute("data-transition", "push");
    expect(presentation).toHaveAttribute("data-direction", "forward");
    expect(screen.getByTestId("presentation-outgoing")).toHaveAttribute(
      "data-slide-id",
      "s1",
    );
    expect(screen.getByTestId("presentation-incoming")).toHaveAttribute(
      "data-slide-id",
      "s2",
    );
    expect(screen.getByTestId("presentation-incoming").className).toContain(
      "presentation-enter-push-forward",
    );
    expect(screen.getByTestId("presentation-outgoing").className).toContain(
      "presentation-leave-push-forward",
    );

    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByTestId("presentation")).toHaveAttribute(
      "data-animating",
      "false",
    );
    expect(screen.getByTestId("presentation-incoming")).toHaveAttribute(
      "data-slide-id",
      "s2",
    );
    expect(screen.queryByTestId("presentation-outgoing")).not.toBeInTheDocument();
  });

  it("plays a backward push in the opposite direction", () => {
    vi.useFakeTimers();
    setup({ s2: "push", s3: "push" }, "s3");
    press("ArrowLeft");

    expect(screen.getByTestId("presentation")).toHaveAttribute(
      "data-direction",
      "backward",
    );
    expect(screen.getByTestId("presentation-incoming").className).toContain(
      "presentation-enter-push-backward",
    );
    expect(screen.getByTestId("presentation-outgoing").className).toContain(
      "presentation-leave-push-backward",
    );
  });

  it("animates fade and zoom", () => {
    vi.useFakeTimers();
    setup({ s2: "fade", s3: "zoom" });
    press("ArrowRight");
    expect(screen.getByTestId("presentation-incoming").className).toContain(
      "presentation-enter-fade",
    );
    act(() => vi.advanceTimersByTime(400));
    press("ArrowRight");
    expect(screen.getByTestId("presentation-incoming").className).toContain(
      "presentation-enter-zoom",
    );
  });

  it("switches instantly when the incoming slide uses none", () => {
    setup({ s2: "none" });
    press("ArrowRight");

    expect(screen.getByTestId("presentation")).toHaveAttribute(
      "data-animating",
      "false",
    );
    expect(screen.getByTestId("presentation-incoming")).toHaveAttribute(
      "data-slide-id",
      "s2",
    );
    expect(screen.queryByTestId("presentation-outgoing")).not.toBeInTheDocument();
  });

  it("settles on the latest slide during rapid navigation", () => {
    vi.useFakeTimers();
    setup({ s2: "push", s3: "push" });
    press("ArrowRight");
    press("ArrowRight");

    expect(screen.getByTestId("presentation-incoming")).toHaveAttribute(
      "data-slide-id",
      "s3",
    );
    expect(screen.getByTestId("presentation-outgoing")).toHaveAttribute(
      "data-slide-id",
      "s1",
    );

    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByTestId("presentation-incoming")).toHaveAttribute(
      "data-slide-id",
      "s3",
    );
    expect(screen.queryByTestId("presentation-outgoing")).not.toBeInTheDocument();
    expect(screen.getByTestId("presentation")).toHaveTextContent("3 / 4");
  });

  it("skips motion when reduced motion is requested", () => {
    state.reducedMotion = true;
    setup({ s2: "push" });
    press("ArrowRight");

    expect(screen.getByTestId("presentation")).toHaveAttribute(
      "data-animating",
      "false",
    );
    expect(screen.getByTestId("presentation-incoming")).toHaveAttribute(
      "data-slide-id",
      "s2",
    );
  });
});
