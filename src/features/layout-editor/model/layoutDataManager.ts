import { invoke } from "@tauri-apps/api/core";
import { applyLayoutCommand } from "../history/layoutHistoryModel";
import type { LayoutCommand, LayoutFieldName } from "../history/layoutHistoryModel";
import { initialElements } from "./schema";
import type { ElementId, LayoutElement, LayoutRecord, WidthBasis } from "./types";

const FIELD_OFFSETS: Record<LayoutFieldName, number> = {
  x: 14,
  y: 18,
  width: 25,
  height: 29,
  pivotX: 35,
  pivotY: 39,
};

const WIDTH_BASIS_OFFSET = 24;

export type LayoutDataState = {
  elements: LayoutElement[];
  unavailableElements: LayoutElement[];
  records: LayoutRecord[];
};

function formatHexOffset(offset: number) {
  return "0x" + offset.toString(16).toUpperCase().padStart(8, "0");
}

function fieldValue(record: LayoutRecord, fieldName: LayoutFieldName) {
  switch (fieldName) {
    case "x":
      return record.x;
    case "y":
      return record.y;
    case "width":
      return record.width;
    case "height":
      return record.height;
    case "pivotX":
      return record.pivotX;
    case "pivotY":
      return record.pivotY;
  }
}

function widthBasis(marker: number, rawValue: number): WidthBasis {
  return {
    offset: formatHexOffset(marker + WIDTH_BASIS_OFFSET),
    rawValue,
    basis: rawValue === 1 ? "parentHeight" : "parentWidth",
  };
}

function unavailableElement(element: LayoutElement, reason: string): LayoutElement {
  return {
    ...element,
    availability: "unavailable",
    unavailableReason: reason,
    marker: "-",
    widthBasis: {
      offset: "-",
      rawValue: 0,
      basis: element.widthBasis.basis,
    },
    fields: Object.fromEntries(
      Object.entries(element.fields).map(([key, field]) => [
        key,
        {
          ...field,
          offset: null,
          writable: false,
        },
      ]),
    ) as LayoutElement["fields"],
  };
}

function applyRecord(element: LayoutElement, record: LayoutRecord): LayoutElement {
  return {
    ...element,
    availability: "available",
    unavailableReason: undefined,
    marker: formatHexOffset(record.marker),
    widthBasis: widthBasis(record.marker, record.widthBasisRaw),
    fields: Object.fromEntries(
      Object.entries(element.fields).map(([key, field]) => {
        const fieldName = key as LayoutFieldName;
        return [
          key,
          {
            ...field,
            offset: formatHexOffset(record.marker + FIELD_OFFSETS[fieldName]),
            currentValue: fieldValue(record, fieldName),
            writable: true,
          },
        ];
      }),
    ) as LayoutElement["fields"],
  };
}

function siblingBefore(element: LayoutElement) {
  const siblings = initialElements.filter((candidate) => candidate.parentId === element.parentId);
  const index = siblings.findIndex((candidate) => candidate.id === element.id);
  return index > 0 ? siblings[index - 1] : null;
}

function siblingAfter(element: LayoutElement) {
  const siblings = initialElements.filter((candidate) => candidate.parentId === element.parentId);
  const index = siblings.findIndex((candidate) => candidate.id === element.id);
  return index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;
}

function resolveRecord(
  element: LayoutElement,
  recordsByLabel: Map<string, LayoutRecord[]>,
  resolved: Map<ElementId, LayoutRecord>,
) {
  let candidates = recordsByLabel.get(element.name) ?? [];
  if (candidates.length === 0) {
    return { record: null, reason: `Record label not found: ${element.name}` };
  }

  const parent = element.parentId ? resolved.get(element.parentId) : null;
  if (element.parentId && !parent) {
    return { record: null, reason: "Parent record was not resolved." };
  }
  if (parent) {
    candidates = candidates.filter((record) => record.marker > parent.marker);
  }

  if (candidates.length > 1) {
    const before = siblingBefore(element);
    const beforeRecord = before ? resolved.get(before.id) : null;
    if (beforeRecord) {
      candidates = candidates.filter((record) => record.marker > beforeRecord.marker);
    }

    const after = siblingAfter(element);
    const afterRecord = after ? resolved.get(after.id) : null;
    if (afterRecord) {
      candidates = candidates.filter((record) => record.marker < afterRecord.marker);
    }
  }

  if (candidates.length === 1) {
    return { record: candidates[0], reason: null };
  }

  return {
    record: null,
    reason:
      candidates.length === 0
        ? "No record matched the expected parent/sibling structure."
        : `Ambiguous record match: ${candidates.length} candidates.`,
  };
}

function resolveElements(records: LayoutRecord[]) {
  const recordsByLabel = new Map<string, LayoutRecord[]>();
  for (const record of records) {
    const current = recordsByLabel.get(record.label) ?? [];
    current.push(record);
    recordsByLabel.set(record.label, current);
  }
  for (const candidates of recordsByLabel.values()) {
    candidates.sort((a, b) => a.marker - b.marker);
  }

  const resolved = new Map<ElementId, LayoutRecord>();
  const failed = new Map<ElementId, string>();

  for (let pass = 0; pass < 4; pass += 1) {
    let changed = false;

    for (const element of initialElements) {
      if (resolved.has(element.id) || failed.has(element.id)) {
        continue;
      }

      const result = resolveRecord(element, recordsByLabel, resolved);
      if (result.record) {
        resolved.set(element.id, result.record);
        changed = true;
      } else if (pass === 3) {
        failed.set(element.id, result.reason ?? "Record could not be resolved.");
      }
    }

    void changed;
  }

  const elements: LayoutElement[] = [];
  const unavailableElements: LayoutElement[] = [];

  for (const element of initialElements) {
    const record = resolved.get(element.id);
    if (record) {
      elements.push(applyRecord(element, record));
      continue;
    }

    const unavailable = unavailableElement(
      element,
      failed.get(element.id) ?? "Record could not be resolved.",
    );
    if (element.hidden) {
      elements.push(unavailable);
    } else {
      unavailableElements.push(unavailable);
    }
  }

  return { elements, unavailableElements };
}

export async function initializeLayoutData(gameDir: string): Promise<LayoutDataState> {
  const records = await invoke<LayoutRecord[]>("scan_layout_records", { gameDir });
  const { elements, unavailableElements } = resolveElements(records);
  return { elements, unavailableElements, records };
}

export function replaceLayoutElements(
  elements: LayoutElement[],
  updater: (element: LayoutElement) => LayoutElement,
) {
  return elements.map((element) => (element.availability === "unavailable" ? element : updater(element)));
}

export function updateLayoutElementPosition(
  elements: LayoutElement[],
  id: ElementId,
  nextX: number,
  nextY: number,
) {
  return elements.map((element) => {
    if (element.id !== id || element.availability === "unavailable") {
      return element;
    }

    return {
      ...element,
      fields: {
        ...element.fields,
        x: {
          ...element.fields.x,
          currentValue: nextX,
        },
        y: {
          ...element.fields.y,
          currentValue: nextY,
        },
      },
    };
  });
}

export function updateLayoutElementField(
  elements: LayoutElement[],
  id: ElementId,
  fieldName: LayoutFieldName,
  value: number,
) {
  if (!Number.isFinite(value)) {
    return elements;
  }

  return elements.map((element) =>
    element.id === id && element.availability !== "unavailable"
      ? {
          ...element,
          fields: {
            ...element.fields,
            [fieldName]: {
              ...element.fields[fieldName],
              currentValue: value,
            },
          },
        }
      : element,
  );
}

export function toggleLayoutElementVisibility(elements: LayoutElement[], id: ElementId) {
  return elements.map((element) =>
    element.id === id ? { ...element, visible: !element.visible } : element,
  );
}

export function applyLayoutDataCommand(
  elements: LayoutElement[],
  command: LayoutCommand,
  side: "before" | "after",
) {
  return applyLayoutCommand(elements, command, side);
}
