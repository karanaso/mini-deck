// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";

import {
  addElement,
  createInitialDeckDoc,
  getOrderedSlideIds,
  setDeckTitle,
} from "@mini-deck/deck";

import { useDeckTitle, useSlideData, useSlideIds } from "@/hooks/use-deck";

function TitleProbe({ doc, onRender }: { doc: Y.Doc; onRender: () => void }) {
  const title = useDeckTitle(doc);
  onRender();
  return <span data-testid="title">{title}</span>;
}

function SlideProbe({
  doc,
  slideId,
  onRender,
}: {
  doc: Y.Doc;
  slideId: string;
  onRender: () => void;
}) {
  const slide = useSlideData(doc, slideId);
  onRender();
  return <span data-testid="slide-elements">{slide?.elements.length ?? 0}</span>;
}

function SlideIdsProbe({ doc }: { doc: Y.Doc }) {
  const ids = useSlideIds(doc);
  return <span data-testid="slide-ids">{ids.join(",")}</span>;
}

afterEach(cleanup);

describe("deck React adapter", () => {
  it("does not re-render the title when a slide changes", async () => {
    const doc = createInitialDeckDoc();
    const slideId = getOrderedSlideIds(doc)[0];
    const onTitleRender = vi.fn();
    const onSlideRender = vi.fn();
    const { getByTestId } = render(
      <>
        <TitleProbe doc={doc} onRender={onTitleRender} />
        <SlideProbe doc={doc} slideId={slideId} onRender={onSlideRender} />
      </>,
    );
    const titleRenders = onTitleRender.mock.calls.length;
    expect(getByTestId("slide-elements").textContent).toBe("0");

    act(() => {
      addElement(doc, slideId, {
        id: "rect-1",
        type: "rect",
        x: 10,
        y: 10,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 1,
        fill: "#fff",
        stroke: "#000",
        strokeWidth: 1,
        cornerRadius: 0,
      });
    });

    await waitFor(() => expect(getByTestId("slide-elements").textContent).toBe("1"));
    expect(onTitleRender.mock.calls.length).toBe(titleRenders);
    expect(onSlideRender.mock.calls.length).toBeGreaterThan(1);

    act(() => setDeckTitle(doc, "Renamed"));
    await waitFor(() => expect(getByTestId("title").textContent).toBe("Renamed"));
  });

  it("tracks slide order and stops subscriptions after unmount", async () => {
    const doc = createInitialDeckDoc();
    const slideId = getOrderedSlideIds(doc)[0];
    const onRender = vi.fn();
    const { getByTestId, unmount } = render(
      <SlideProbe doc={doc} slideId={slideId} onRender={onRender} />,
    );
    expect(getByTestId("slide-elements").textContent).toBe("0");
    unmount();
    const renders = onRender.mock.calls.length;

    expect(() =>
      addElement(doc, slideId, {
        id: "rect-2",
        type: "rect",
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        rotation: 0,
        opacity: 1,
        fill: "#fff",
        stroke: "#000",
        strokeWidth: 1,
        cornerRadius: 0,
      }),
    ).not.toThrow();
    expect(onRender.mock.calls.length).toBe(renders);
  });

  it("returns stable slide-id snapshots", () => {
    const doc = createInitialDeckDoc();
    const { getByTestId } = render(<SlideIdsProbe doc={doc} />);
    expect(getByTestId("slide-ids").textContent?.split(",")).toHaveLength(1);
  });
});
