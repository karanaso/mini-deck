import Konva from "konva";

import {
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  getLineEndpoints,
  getShapePoints,
  type ElementData,
  type SlideData,
} from "@mini-deck/deck";

import { loadImage } from "./images";

export interface RenderSlideOptions {
  outputWidth?: number;
  outputHeight?: number;
}

export async function renderSlideToCanvas(
  slide: SlideData,
  options: RenderSlideOptions = {},
): Promise<HTMLCanvasElement> {
  if (typeof document === "undefined") {
    throw new Error("Slides can only be rendered in the browser");
  }

  const outputWidth = options.outputWidth ?? SLIDE_WIDTH;
  const outputHeight = options.outputHeight ?? SLIDE_HEIGHT;
  const scale = outputWidth / SLIDE_WIDTH;
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-100000px";
  container.style.top = "-100000px";
  document.body.appendChild(container);

  const stage = new Konva.Stage({
    container,
    width: outputWidth,
    height: outputHeight,
  });
  const layer = new Konva.Layer({ listening: false });
  stage.add(layer);

  try {
    await document.fonts.ready;
    const content = new Konva.Group({ scaleX: scale, scaleY: scale });
    layer.add(content);

    content.add(
      new Konva.Rect({
        x: 0,
        y: 0,
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        fill: slide.background || "#ffffff",
        listening: false,
      }),
    );

    for (const element of slide.elements) {
      const node = await createElementNode(element, false);
      content.add(node);
    }

    layer.draw();
    const canvas = stage.toCanvas({
      x: 0,
      y: 0,
      width: outputWidth,
      height: outputHeight,
      pixelRatio: 1,
    });
    return canvas;
  } finally {
    stage.destroy();
    container.remove();
  }
}

export async function renderSlideToDataUrl(
  slide: SlideData,
  options: RenderSlideOptions = {},
): Promise<string> {
  const canvas = await renderSlideToCanvas(slide, options);
  return canvas.toDataURL("image/png");
}

export async function createElementNode(
  element: ElementData,
  interactive: boolean,
): Promise<Konva.Group> {
  const group = new Konva.Group({
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
    offsetX: element.width / 2,
    offsetY: element.height / 2,
    width: element.width,
    height: element.height,
    rotation: element.rotation,
    opacity: element.opacity,
    listening: interactive,
    draggable: false,
  });
  group.setAttr("elementId", element.id);

  switch (element.type) {
    case "text":
      group.add(
        new Konva.Text({
          text: element.text,
          width: element.width,
          height: element.height,
          fontSize: element.fontSize,
          fontFamily: "Inter",
          fill: element.fill,
          align: element.align,
          wrap: "word",
          verticalAlign: "top",
          lineHeight: 1.2,
          listening: interactive,
        }),
      );
      break;
    case "rect":
      group.add(
        new Konva.Rect({
          width: element.width,
          height: element.height,
          fill: element.fill,
          stroke: element.stroke,
          strokeWidth: element.strokeWidth,
          cornerRadius: element.cornerRadius,
          listening: interactive,
        }),
      );
      break;
    case "ellipse":
      group.add(
        new Konva.Ellipse({
          x: element.width / 2,
          y: element.height / 2,
          radiusX: element.width / 2,
          radiusY: element.height / 2,
          fill: element.fill,
          stroke: element.stroke,
          strokeWidth: element.strokeWidth,
          listening: interactive,
        }),
      );
      break;
    case "arrow": {
      const startX = element.flipX ? element.width : 0;
      const startY = element.flipY ? element.height : 0;
      const endX = element.flipX ? 0 : element.width;
      const endY = element.flipY ? 0 : element.height;
      const pointer = Math.max(16, element.strokeWidth * 4);
      group.add(
        new Konva.Arrow({
          points: [startX, startY, endX, endY],
          stroke: element.stroke,
          fill: element.stroke,
          strokeWidth: element.strokeWidth,
          pointerLength: pointer,
          pointerWidth: pointer,
          lineCap: "round",
          listening: interactive,
        }),
      );
      break;
    }
    case "image": {
      const image = await loadImage(`/api/assets/${element.assetId}`);
      group.add(
        new Konva.Image({
          image,
          width: element.width,
          height: element.height,
          listening: interactive,
        }),
      );
      break;
    }
    case "shape": {
      group.add(
        new Konva.Line({
          points: getShapePoints(element.shape, element.width, element.height),
          closed: true,
          fill: element.fill,
          stroke: element.stroke,
          strokeWidth: element.strokeWidth,
          lineJoin: "round",
          listening: interactive,
        }),
      );
      break;
    }
    case "line": {
      const [startX, startY, endX, endY] = getLineEndpoints(
        element.width,
        element.height,
        element.flipX,
        element.flipY,
      );
      group.add(
        new Konva.Line({
          points: [startX, startY, endX, endY],
          stroke: element.stroke,
          strokeWidth: element.strokeWidth,
          lineCap: "round",
          listening: interactive,
        }),
      );
      break;
    }
  }

  return group;
}
