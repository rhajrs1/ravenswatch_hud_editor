import { getElement } from "../element-tree/elementTreeModel";
import type { LayoutElement, WorldRect } from "../model/types";

function frameAnchorY(value: number, screenHeight: number) {
  return value * screenHeight;
}

export function normalizedFromRootAnchorX(x: number, screenWidth: number) {
  return x / screenWidth;
}

export function worldRect(
  element: LayoutElement,
  elements: LayoutElement[],
  screenWidth: number,
  screenHeight: number,
): WorldRect {
  const rootWidth = screenWidth;
  const rootHeight = screenHeight;
  const parent = element.parentId ? getElement(elements, element.parentId) : null;
  const parentRect = parent ? worldRect(parent, elements, screenWidth, screenHeight) : null;
  const widthReference = parentRect
    ? element.widthBasis.basis === "parentHeight"
      ? parentRect.height
      : parentRect.width
    : element.widthBasis.basis === "parentHeight"
      ? rootHeight
      : rootWidth;
  const anchorX = parentRect
    ? parentRect.x + element.fields.x.currentValue * parentRect.width
    : element.fields.x.currentValue * rootWidth;
  const anchorY = parentRect
    ? parentRect.y + element.fields.y.currentValue * parentRect.height
    : frameAnchorY(element.fields.y.currentValue, rootHeight);
  const width = element.fields.width.currentValue * widthReference;
  const height = parentRect
    ? element.fields.height.currentValue * parentRect.height
    : element.fields.height.currentValue * rootHeight;

  return {
    anchorX,
    anchorY,
    x: anchorX - width * element.fields.pivotX.currentValue,
    y: anchorY - height * element.fields.pivotY.currentValue,
    width,
    height,
  };
}
