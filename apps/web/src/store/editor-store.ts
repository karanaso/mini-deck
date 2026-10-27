import { create } from "zustand";

import { SHAPE_KINDS, isShapeKind, type ShapeKind } from "@mini-deck/deck";

export type ShapeTool = ShapeKind | "line";
export type EditorTool =
  | "select"
  | "text"
  | "rect"
  | "ellipse"
  | "arrow"
  | ShapeTool;

export const SHAPE_TOOLS: readonly ShapeTool[] = [...SHAPE_KINDS, "line"];

export function isShapeTool(tool: EditorTool): tool is ShapeTool {
  return tool === "line" || isShapeKind(tool);
}

interface EditorState {
  currentSlideId: string | null;
  zoom: number;
  tool: EditorTool;
  selectedIds: string[];
  shareOpen: boolean;
  presentationOpen: boolean;
  participantOpen: boolean;
  setCurrentSlide: (slideId: string) => void;
  setZoom: (zoom: number) => void;
  setTool: (tool: EditorTool) => void;
  selectOnly: (elementId: string) => void;
  toggleSelection: (elementId: string) => void;
  setSelectedIds: (elementIds: string[]) => void;
  clearSelection: () => void;
  setShareOpen: (open: boolean) => void;
  setPresentationOpen: (open: boolean) => void;
  setParticipantOpen: (open: boolean) => void;
  reset: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  currentSlideId: null,
  zoom: 1,
  tool: "select",
  selectedIds: [],
  shareOpen: false,
  presentationOpen: false,
  participantOpen: false,
  setCurrentSlide: (slideId) => set({ currentSlideId: slideId, selectedIds: [] }),
  setZoom: (zoom) => set({ zoom: Math.max(0.5, Math.min(3, zoom)) }),
  setTool: (tool) => set({ tool }),
  selectOnly: (elementId) => set({ selectedIds: [elementId] }),
  toggleSelection: (elementId) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(elementId)
        ? state.selectedIds.filter((id) => id !== elementId)
        : [...state.selectedIds, elementId],
    })),
  setSelectedIds: (elementIds) => set({ selectedIds: elementIds }),
  clearSelection: () => set({ selectedIds: [] }),
  setShareOpen: (shareOpen) => set({ shareOpen }),
  setPresentationOpen: (presentationOpen) => set({ presentationOpen }),
  setParticipantOpen: (participantOpen) => set({ participantOpen }),
  reset: () =>
    set({
      currentSlideId: null,
      zoom: 1,
      tool: "select",
      selectedIds: [],
      shareOpen: false,
      presentationOpen: false,
      participantOpen: false,
    }),
}));
