import { invoke } from "@tauri-apps/api/core";
import type { LayoutElement, LayoutPatch, LayoutValue } from "./types";

export function parseHexOffset(offset: string | null) {
  if (!offset) {
    return null;
  }
  return Number.parseInt(offset.replace(/^0x/i, ""), 16);
}

export function writableLayoutOffsets(elements: LayoutElement[]) {
  const offsets = new Set<number>();

  for (const element of elements) {
    for (const field of Object.values(element.fields)) {
      const offset = field.writable ? parseHexOffset(field.offset) : null;
      if (offset !== null) {
        offsets.add(offset);
      }
    }
  }

  return [...offsets];
}

export async function readLayoutValues(gameDir: string, elements: LayoutElement[]) {
  const offsets = writableLayoutOffsets(elements);
  return invoke<LayoutValue[]>("load_layout_values", {
    gameDir,
    requests: offsets.map((offset) => ({ offset })),
  });
}

export async function saveLayoutValues(gameDir: string, elements: LayoutElement[]) {
  const patches: LayoutPatch[] = elements.flatMap((element) =>
    Object.values(element.fields)
      .filter((field) => field.writable && field.offset)
      .map((field) => ({
        offset: parseHexOffset(field.offset) ?? 0,
        value: field.currentValue,
      })),
  );

  await invoke("save_layout_values", { gameDir, patches });
}

export async function backupLayoutFile(gameDir: string, targetPath: string) {
  await invoke("backup_layout_file", { gameDir, targetPath });
}

export async function restoreLayoutFile(gameDir: string, backupPath: string) {
  await invoke("restore_layout_file", { gameDir, backupPath });
}
