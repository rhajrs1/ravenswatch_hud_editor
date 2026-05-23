import type { ElementId, LayoutElement } from "../model/types";

export type LayoutFieldName = keyof LayoutElement["fields"];

export type LayoutFieldChange = {
  elementId: ElementId;
  field: LayoutFieldName;
  before: number;
  after: number;
};

export type LayoutCommand = {
  label: string;
  changes: LayoutFieldChange[];
};

export function createLayoutCommand(label: string, changes: LayoutFieldChange[]): LayoutCommand | null {
  const meaningfulChanges = changes.filter(
    (change) =>
      Number.isFinite(change.before) &&
      Number.isFinite(change.after) &&
      change.before !== change.after,
  );

  if (meaningfulChanges.length === 0) {
    return null;
  }

  return {
    label,
    changes: meaningfulChanges,
  };
}

export function applyLayoutCommand(
  elements: LayoutElement[],
  command: LayoutCommand,
  direction: "before" | "after",
) {
  const changeByElement = new Map<ElementId, LayoutFieldChange[]>();

  for (const change of command.changes) {
    const elementChanges = changeByElement.get(change.elementId) ?? [];
    elementChanges.push(change);
    changeByElement.set(change.elementId, elementChanges);
  }

  return elements.map((element) => {
    const elementChanges = changeByElement.get(element.id);
    if (!elementChanges) {
      return element;
    }

    return {
      ...element,
      fields: {
        ...element.fields,
        ...Object.fromEntries(
          elementChanges.map((change) => [
            change.field,
            {
              ...element.fields[change.field],
              currentValue: change[direction],
            },
          ]),
        ),
      },
    };
  });
}
