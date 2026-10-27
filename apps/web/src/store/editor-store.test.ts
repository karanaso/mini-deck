import { beforeEach, describe, expect, it } from "vitest";

import { useEditorStore, SHAPE_TOOLS } from "./editor-store";

describe("editor store", () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  it("switches slides and clears selection", () => {
    const store = useEditorStore.getState();
    store.setSelectedIds(["a", "b"]);
    store.setCurrentSlide("slide-2");
    expect(useEditorStore.getState().currentSlideId).toBe("slide-2");
    expect(useEditorStore.getState().selectedIds).toEqual([]);
  });

  it("manages selection and tools", () => {
    const store = useEditorStore.getState();
    store.setTool("rect");
    store.selectOnly("a");
    store.toggleSelection("b");
    expect(useEditorStore.getState().tool).toBe("rect");
    expect(useEditorStore.getState().selectedIds).toEqual(["a", "b"]);
    store.toggleSelection("a");
    expect(useEditorStore.getState().selectedIds).toEqual(["b"]);
    store.clearSelection();
    expect(useEditorStore.getState().selectedIds).toEqual([]);
  });

  it("accepts every shape tool and resets to select", () => {
    const store = useEditorStore.getState();
    for (const tool of SHAPE_TOOLS) {
      store.setTool(tool);
      expect(useEditorStore.getState().tool).toBe(tool);
    }
    store.reset();
    expect(useEditorStore.getState().tool).toBe("select");
  });

  it("clamps zoom and controls dialogs", () => {
    const store = useEditorStore.getState();
    store.setZoom(99);
    expect(useEditorStore.getState().zoom).toBe(3);
    store.setZoom(0);
    expect(useEditorStore.getState().zoom).toBe(0.5);
    store.setShareOpen(true);
    store.setPresentationOpen(true);
    store.setParticipantOpen(true);
    expect(useEditorStore.getState()).toMatchObject({
      shareOpen: true,
      presentationOpen: true,
      participantOpen: true,
    });
  });
});
