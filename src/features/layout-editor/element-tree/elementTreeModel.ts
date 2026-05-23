import type { ElementId, LayoutElement } from "../model/types";

export function getElement(elements: LayoutElement[], id: ElementId) {
  return elements.find((element) => element.id === id);
}

export function getChildren(elements: LayoutElement[], parentId: ElementId | null) {
  return elements.filter((element) => element.parentId === parentId);
}

export function isEffectivelyVisible(element: LayoutElement, elements: LayoutElement[]): boolean {
  if (!element.visible) {
    return false;
  }
  if (!element.parentId) {
    return true;
  }
  const parent = getElement(elements, element.parentId);
  return parent ? isEffectivelyVisible(parent, elements) : true;
}

export function isAncestorHidden(element: LayoutElement, elements: LayoutElement[]): boolean {
  if (!element.parentId) {
    return false;
  }
  const parent = getElement(elements, element.parentId);
  if (!parent) {
    return false;
  }
  return !parent.visible || isAncestorHidden(parent, elements);
}
