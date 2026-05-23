import type { LayoutElement } from "./types";

export type LayoutSnapshot = Record<string, number>;

function snapshotValue(value: number) {
  return new Float32Array([value])[0];
}

export function createLayoutSnapshot(elements: LayoutElement[]) {
  const snapshot: LayoutSnapshot = {};

  for (const element of elements) {
    for (const [fieldName, field] of Object.entries(element.fields)) {
      if (field.writable) {
        snapshot[`${element.id}.${fieldName}`] = snapshotValue(field.currentValue);
      }
    }
  }

  return snapshot;
}

export function layoutSnapshotsEqual(left: LayoutSnapshot | null, right: LayoutSnapshot | null) {
  if (!left || !right) {
    return false;
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => Object.prototype.hasOwnProperty.call(right, key) && left[key] === right[key]);
}
