import type * as Y from "yjs";

import {
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  addElement,
  createElementId,
  type ImageCredit,
} from "@mini-deck/deck";

export const MAX_IMAGE_ELEMENT_WIDTH = 1200;
export const MAX_IMAGE_ELEMENT_HEIGHT = 675;

export interface ImageAsset {
  id: string;
  width: number;
  height: number;
}

interface UndoManagerLike {
  stopCapturing(): void;
}

export interface PlaceImageAssetOptions {
  doc: Y.Doc;
  slideId: string;
  asset: ImageAsset;
  credit?: ImageCredit;
  selectOnly: (elementId: string) => void;
  undoManager: UndoManagerLike;
}

/**
 * Places a deck image at the center of the slide, preserving its aspect ratio
 * and fitting it inside a 1200x675 box when the source is larger.
 */
export function placeImageAsset({
  doc,
  slideId,
  asset,
  credit,
  selectOnly,
  undoManager,
}: PlaceImageAssetOptions): string {
  const sourceWidth = Math.max(1, asset.width);
  const sourceHeight = Math.max(1, asset.height);
  const scale = Math.min(
    1,
    MAX_IMAGE_ELEMENT_WIDTH / sourceWidth,
    MAX_IMAGE_ELEMENT_HEIGHT / sourceHeight,
  );
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const elementId = createElementId();
  addElement(doc, slideId, {
    id: elementId,
    type: "image",
    assetId: asset.id,
    x: (SLIDE_WIDTH - width) / 2,
    y: (SLIDE_HEIGHT - height) / 2,
    width,
    height,
    rotation: 0,
    opacity: 1,
    ...(credit ? { credit } : {}),
  });
  selectOnly(elementId);
  undoManager.stopCapturing();
  return elementId;
}
