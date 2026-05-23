import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
  IconChevronDown,
  IconChevronRight,
  IconEye,
  IconEyeOff,
  IconFolder,
} from "@tabler/icons-react";
import { Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import "./App.css";

const TARGET_ASPECT = 16 / 9;
const FALLBACK_MONITOR: MonitorInfo = {
  id: "fallback-5120x1440",
  name: "Display 1",
  width: 5120,
  height: 1440,
  x: 0,
  y: 0,
  scaleFactor: 1,
  isPrimary: true,
};

type MonitorInfo = {
  id: string;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  scaleFactor: number;
  isPrimary: boolean;
};

type NativeMonitorInfo = {
  id: string;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  scale_factor: number;
  is_primary: boolean;
};

type GameFolderState = {
  found: boolean;
  gameDir: string | null;
  layoutPath: string | null;
  source: string;
  message: string;
};

type LayoutField = {
  offset: string | null;
  defaultValue: number;
  currentValue: number;
  writable: boolean;
};

type ElementId =
  | "left-frame"
  | "hud-left"
  | "status-elements"
  | "skill-mo-navzone"
  | "skill-frame"
  | "skills-items-separator-frame"
  | "magical-objects-frame"
  | "bonus-frame"
  | "vitality-frame"
  | "damage-bonus-frame"
  | "armour-frame"
  | "crit-chance-frame"
  | "crit-damage-frame"
  | "exp-frame"
  | "life-frame"
  | "center-frame"
  | "hud-center"
  | "ability-frame"
  | "abilities-banner-frame"
  | "abilities-layout-back"
  | "abilities-layout"
  | "abilities-layout-top"
  | "portrait-frame"
  | "right-frame"
  | "hud-right"
  | "time-elements"
  | "minimap-frame"
  | "minimap-picture"
  | "minimap-overlay-picture"
  | "overtime-text-minimap-frame"
  | "difficulty-modifiers-frame"
  | "difficulty-frame"
  | "modifiers-layout"
  | "modifier-frame-size-ref"
  | "peers-hero-miniatures-frame"
  | "social-options-menu"
  | "consumables-frame"
  | "dream-shards-frame"
  | "reroll-frame"
  | "revive-frame"
  | "key-frame";

type LayoutElement = {
  id: ElementId;
  parentId: ElementId | null;
  name: string;
  kind: "Frame";
  marker: string;
  fields: {
    x: LayoutField;
    y: LayoutField;
    width: LayoutField;
    height: LayoutField;
    pivotX: LayoutField;
    pivotY: LayoutField;
  };
  color: string;
  visible: boolean;
};

type LayoutPatch = {
  offset: number;
  value: number;
};

type LayoutValue = {
  offset: number;
  value: number;
};

const field = (
  offset: string | null,
  defaultValue: number,
  currentValue = defaultValue,
  writable = Boolean(offset),
): LayoutField => ({
  offset,
  defaultValue,
  currentValue,
  writable,
});

const elementFields = (
  offsets: Partial<Record<keyof LayoutElement["fields"], string | null>>,
  defaults: {
    x: number;
    y: number;
    width: number;
    height: number;
    pivotX: number;
    pivotY: number;
  },
  currentX = defaults.x,
): LayoutElement["fields"] => ({
  x: field(offsets.x ?? null, defaults.x, currentX, Boolean(offsets.x)),
  y: field(offsets.y ?? null, defaults.y, defaults.y, Boolean(offsets.y)),
  width: field(offsets.width ?? null, defaults.width, defaults.width, Boolean(offsets.width)),
  height: field(offsets.height ?? null, defaults.height, defaults.height, Boolean(offsets.height)),
  pivotX: field(offsets.pivotX ?? null, defaults.pivotX, defaults.pivotX, Boolean(offsets.pivotX)),
  pivotY: field(offsets.pivotY ?? null, defaults.pivotY, defaults.pivotY, Boolean(offsets.pivotY)),
});

const initialElements: LayoutElement[] = [
  {
    id: "left-frame",
    parentId: null,
    name: "LEFT_FRAME",
    kind: "Frame",
    marker: "0x001029AA",
    fields: elementFields({ x: "0x001029B8" }, { x: 0.01, y: 0.5, width: 0.97, height: 0.97, pivotX: 0, pivotY: 0.5 }),
    color: "#86efac",
    visible: true,
  },
  {
    id: "hud-left",
    parentId: "left-frame",
    name: "HUD_Frame_Left",
    kind: "Frame",
    marker: "0x00103C9D",
    fields: elementFields({ x: "0x00103CAB" }, { x: 0.5, y: 0.5, width: 1, height: 1, pivotX: 0.5, pivotY: 0.5 }),
    color: "#31c48d",
    visible: true,
  },
  {
    id: "status-elements",
    parentId: "hud-left",
    name: "Status_Elements",
    kind: "Frame",
    marker: "0x00103CFC",
    fields: elementFields({ x: "0x00103D0A" }, { x: 0, y: 1, width: 0.33, height: 0.1, pivotX: 0, pivotY: 0.83 }),
    color: "#6ee7b7",
    visible: true,
  },
  {
    id: "skill-mo-navzone",
    parentId: "hud-left",
    name: "Skill & MO NavZone",
    kind: "Frame",
    marker: "0x00103D58",
    fields: elementFields({ x: "0x00103D66" }, { x: 0, y: 0.5, width: 0.16, height: 0.813, pivotX: 0.2885, pivotY: 0.5 }),
    color: "#34d399",
    visible: true,
  },
  {
    id: "skill-frame",
    parentId: "skill-mo-navzone",
    name: "Skill_Frame",
    kind: "Frame",
    marker: "0x00105389",
    fields: elementFields({ x: "0x00105397" }, { x: 0.5, y: 1, width: 0.065741, height: 0.362963, pivotX: 0.5, pivotY: 1 }),
    color: "#2dd4bf",
    visible: true,
  },
  {
    id: "skills-items-separator-frame",
    parentId: "skill-mo-navzone",
    name: "Skills-Items_Separator_Frame",
    kind: "Frame",
    marker: "0x001053D9",
    fields: elementFields({ x: "0x001053E7" }, { x: 0.5, y: 0.533, width: 0.064815, height: 0.005556, pivotX: 0.5, pivotY: 0.5 }),
    color: "#14b8a6",
    visible: true,
  },
  {
    id: "magical-objects-frame",
    parentId: "skill-mo-navzone",
    name: "Magical_Objects_Frame",
    kind: "Frame",
    marker: "0x00105476",
    fields: elementFields({ x: "0x00105484" }, { x: 0.5, y: 0.526, width: 0.065741, height: 0.362963, pivotX: 0.5, pivotY: 1 }),
    color: "#0d9488",
    visible: true,
  },
  {
    id: "bonus-frame",
    parentId: "hud-left",
    name: "Bonus_Frame",
    kind: "Frame",
    marker: "0x00103DBB",
    fields: elementFields({ x: "0x00103DC9" }, { x: 0.33, y: 1, width: 0.2083333, height: 0.0462963, pivotX: 0, pivotY: 1 }),
    color: "#10b981",
    visible: true,
  },
  {
    id: "vitality-frame",
    parentId: "bonus-frame",
    name: "Vitality_Frame",
    kind: "Frame",
    marker: "0x00103E1F",
    fields: elementFields({ x: "0x00103E2D" }, { x: 0.1, y: 0.5, width: 0.0416667, height: 0.0416667, pivotX: 0.5, pivotY: 0.5 }),
    color: "#22c55e",
    visible: true,
  },
  {
    id: "damage-bonus-frame",
    parentId: "bonus-frame",
    name: "Damage_Bonus_Frame",
    kind: "Frame",
    marker: "0x00103E8A",
    fields: elementFields({ x: "0x00103E98" }, { x: 0.3, y: 0.5, width: 0.0416667, height: 0.0416667, pivotX: 0.5, pivotY: 0.5 }),
    color: "#16a34a",
    visible: true,
  },
  {
    id: "armour-frame",
    parentId: "bonus-frame",
    name: "Armour_Frame",
    kind: "Frame",
    marker: "0x00103EF9",
    fields: elementFields({ x: "0x00103F07" }, { x: 0.5, y: 0.5, width: 0.0416667, height: 0.0416667, pivotX: 0.5, pivotY: 0.5 }),
    color: "#15803d",
    visible: true,
  },
  {
    id: "crit-chance-frame",
    parentId: "bonus-frame",
    name: "Crit_Chance_Frame",
    kind: "Frame",
    marker: "0x00103F62",
    fields: elementFields({ x: "0x00103F70" }, { x: 0.7, y: 0.5, width: 0.0416667, height: 0.0416667, pivotX: 0.5, pivotY: 0.5 }),
    color: "#166534",
    visible: true,
  },
  {
    id: "crit-damage-frame",
    parentId: "bonus-frame",
    name: "Crit_Damage_Frame",
    kind: "Frame",
    marker: "0x00103FCC",
    fields: elementFields({ x: "0x00103FDA" }, { x: 0.9, y: 0.5, width: 0.0416667, height: 0.0416667, pivotX: 0.5, pivotY: 0.5 }),
    color: "#14532d",
    visible: true,
  },
  {
    id: "exp-frame",
    parentId: "status-elements",
    name: "Exp_Frame",
    kind: "Frame",
    marker: "0x00105584",
    fields: elementFields({ x: "0x00105592" }, { x: 0, y: 1, width: 0, height: 0.1018519, pivotX: 0, pivotY: 1 }),
    color: "#059669",
    visible: true,
  },
  {
    id: "life-frame",
    parentId: "status-elements",
    name: "Life_Frame",
    kind: "Frame",
    marker: "0x00105794",
    fields: elementFields({ x: "0x001057A2" }, { x: 0.091, y: 0.055, width: 0.2592593, height: 0.0444444, pivotX: 0.12, pivotY: 0.2 }),
    color: "#047857",
    visible: true,
  },
  {
    id: "center-frame",
    parentId: null,
    name: "CENTER FRAME",
    kind: "Frame",
    marker: "0x00102949",
    fields: elementFields({ x: "0x00102957" }, { x: 0.5, y: 0.5, width: 1.703, height: 0.97, pivotX: 0.5, pivotY: 0.5 }),
    color: "#fde68a",
    visible: true,
  },
  {
    id: "hud-center",
    parentId: "center-frame",
    name: "HUD_Frame_Center",
    kind: "Frame",
    marker: "0x0010655F",
    fields: elementFields({ x: null }, { x: 0.5, y: 0.5, width: 1, height: 1, pivotX: 0.5, pivotY: 0.5 }),
    color: "#f59e0b",
    visible: true,
  },
  {
    id: "ability-frame",
    parentId: "hud-center",
    name: "Ability_Frame",
    kind: "Frame",
    marker: "0x001065B8",
    fields: elementFields({ x: "0x001065C6" }, { x: 0.5, y: 1, width: 0.71, height: 0.085, pivotX: 0.5, pivotY: 1 }),
    color: "#fbbf24",
    visible: true,
  },
  {
    id: "abilities-banner-frame",
    parentId: "ability-frame",
    name: "Abilities_Banner_Frame",
    kind: "Frame",
    marker: "0x001066E4",
    fields: elementFields({ x: "0x001066F2" }, { x: 0.5, y: 0.3869276, width: 1, height: 1, pivotX: 0.5, pivotY: 0.5 }),
    color: "#f59e0b",
    visible: true,
  },
  {
    id: "abilities-layout-back",
    parentId: "ability-frame",
    name: "Abilities_Layout_Back",
    kind: "Frame",
    marker: "0x001067AA",
    fields: elementFields({ x: "0x001067B8" }, { x: 0.5, y: 0.3869276, width: 0.73, height: 0.83, pivotX: 0.415, pivotY: 0.5 }),
    color: "#fbbf24",
    visible: true,
  },
  {
    id: "abilities-layout",
    parentId: "ability-frame",
    name: "Abilities_Layout",
    kind: "Frame",
    marker: "0x0010681C",
    fields: elementFields({ x: "0x0010682A" }, { x: 0.5, y: 0.3869, width: 0.73, height: 0.83, pivotX: 0.415, pivotY: 0.5 }),
    color: "#f59e0b",
    visible: true,
  },
  {
    id: "abilities-layout-top",
    parentId: "ability-frame",
    name: "Abilities_Layout_Top",
    kind: "Frame",
    marker: "0x00106889",
    fields: elementFields({ x: "0x00106897" }, { x: 0.5, y: 0.3869276, width: 0.73, height: 0.83, pivotX: 0.415, pivotY: 0.5 }),
    color: "#d97706",
    visible: true,
  },
  {
    id: "portrait-frame",
    parentId: "ability-frame",
    name: "Portrait Frame",
    kind: "Frame",
    marker: "0x00106743",
    fields: elementFields({ x: "0x00106751" }, { x: 0.12, y: 0.385, width: 0, height: 1.45, pivotX: 0.5, pivotY: 0.5 }),
    color: "#d97706",
    visible: true,
  },
  {
    id: "right-frame",
    parentId: null,
    name: "RIGHT FRAME",
    kind: "Frame",
    marker: "0x001028F5",
    fields: elementFields({ x: "0x00102903" }, { x: 0.99, y: 0.5, width: 0.97, height: 0.97, pivotX: 1, pivotY: 0.5 }),
    color: "#bfdbfe",
    visible: true,
  },
  {
    id: "hud-right",
    parentId: "right-frame",
    name: "HUD_Frame_Right",
    kind: "Frame",
    marker: "0x001098B7",
    fields: elementFields({ x: "0x001098C5" }, { x: 0.5, y: 0.5, width: 1, height: 1, pivotX: 0.5, pivotY: 0.5 }),
    color: "#60a5fa",
    visible: true,
  },
  {
    id: "time-elements",
    parentId: "hud-right",
    name: "Time_Elements",
    kind: "Frame",
    marker: "0x00109923",
    fields: elementFields({ x: "0x00109931" }, { x: 1, y: 1, width: 0.3, height: 0.1, pivotX: 1, pivotY: 0.83 }),
    color: "#93c5fd",
    visible: true,
  },
  {
    id: "minimap-frame",
    parentId: "hud-right",
    name: "Minimap_Frame",
    kind: "Frame",
    marker: "0x00109979",
    fields: elementFields({ x: "0x00109987" }, { x: 1, y: 0.9694999, width: 0.4, height: 0.4, pivotX: 1, pivotY: 1 }),
    color: "#60a5fa",
    visible: true,
  },
  {
    id: "minimap-picture",
    parentId: "minimap-frame",
    name: "Minimap_Picture",
    kind: "Frame",
    marker: "0x0010AD87",
    fields: elementFields({ x: "0x0010AD95" }, { x: 0.5, y: 0.5, width: 1, height: 1, pivotX: 0.5, pivotY: 0.5 }),
    color: "#7dd3fc",
    visible: true,
  },
  {
    id: "minimap-overlay-picture",
    parentId: "minimap-frame",
    name: "Minimap_Overlay_Picture",
    kind: "Frame",
    marker: "0x0010AE52",
    fields: elementFields({ x: "0x0010AE60" }, { x: 0.5, y: 0.5, width: 1, height: 1, pivotX: 0.5, pivotY: 0.5 }),
    color: "#38bdf8",
    visible: true,
  },
  {
    id: "overtime-text-minimap-frame",
    parentId: "minimap-frame",
    name: "Overtime_Text_Minimap_Frame",
    kind: "Frame",
    marker: "0x0010AF0F",
    fields: elementFields({ x: "0x0010AF1D" }, { x: 1, y: 0.820286, width: 0.16, height: 0.08, pivotX: 1, pivotY: 1 }),
    color: "#0ea5e9",
    visible: true,
  },
  {
    id: "difficulty-modifiers-frame",
    parentId: "hud-right",
    name: "Difficulty & Modifiers Frame",
    kind: "Frame",
    marker: "0x001099DB",
    fields: elementFields({ x: "0x001099E9" }, { x: 1, y: 0, width: 0.45, height: 0.5, pivotX: 1, pivotY: 0 }),
    color: "#3b82f6",
    visible: true,
  },
  {
    id: "difficulty-frame",
    parentId: "difficulty-modifiers-frame",
    name: "Difficulty Frame",
    kind: "Frame",
    marker: "0x0010ABBB",
    fields: elementFields({ x: "0x0010ABC9" }, { x: 0.95, y: 0.02, width: 0.0555556, height: 0.0555556, pivotX: 1, pivotY: 0 }),
    color: "#60a5fa",
    visible: true,
  },
  {
    id: "modifiers-layout",
    parentId: "difficulty-modifiers-frame",
    name: "Modifiers Layout",
    kind: "Frame",
    marker: "0x0010AC14",
    fields: elementFields({ x: "0x0010AC22" }, { x: 0.94, y: 0.175, width: 1, height: 0.55, pivotX: 1, pivotY: 0 }),
    color: "#3b82f6",
    visible: true,
  },
  {
    id: "modifier-frame-size-ref",
    parentId: "modifiers-layout",
    name: "Modifier Frame Size Ref",
    kind: "Frame",
    marker: "0x0010AC6D",
    fields: elementFields({ x: "0x0010AC7B" }, { x: 1, y: 0, width: 1, height: 0.2, pivotX: 1, pivotY: 0 }),
    color: "#2563eb",
    visible: true,
  },
  {
    id: "peers-hero-miniatures-frame",
    parentId: "hud-right",
    name: "Peers_Hero_Miniatures_Frame",
    kind: "Frame",
    marker: "0x00109A44",
    fields: elementFields({ x: "0x00109A52" }, { x: 1, y: 0.57, width: 0.32, height: 0.18, pivotX: 1.15, pivotY: 1 }),
    color: "#2563eb",
    visible: true,
  },
  {
    id: "social-options-menu",
    parentId: "hud-right",
    name: "Social_Options_Menu",
    kind: "Frame",
    marker: "0x00109AA8",
    fields: elementFields({ x: "0x00109AB6" }, { x: 1, y: 0.585, width: 0.2, height: 0.2, pivotX: 1, pivotY: 0 }),
    color: "#1d4ed8",
    visible: true,
  },
  {
    id: "consumables-frame",
    parentId: "hud-right",
    name: "Consumables_Frame",
    kind: "Frame",
    marker: "0x00109B00",
    fields: elementFields({ x: "0x00109B0E" }, { x: 0.695, y: 1, width: 0.1777778, height: 0.05, pivotX: 1, pivotY: 1 }),
    color: "#1d4ed8",
    visible: true,
  },
  {
    id: "dream-shards-frame",
    parentId: "consumables-frame",
    name: "Dream_Shards_Frame",
    kind: "Frame",
    marker: "0x00109B66",
    fields: elementFields({ x: "0x00109B74" }, { x: 0.125, y: 1, width: 0.0416667, height: 0.0416667, pivotX: 0.5, pivotY: 1 }),
    color: "#1e40af",
    visible: true,
  },
  {
    id: "reroll-frame",
    parentId: "consumables-frame",
    name: "Reroll_Frame",
    kind: "Frame",
    marker: "0x00109BD5",
    fields: elementFields({ x: "0x00109BE3" }, { x: 0.375, y: 1, width: 0.0416667, height: 0.0416667, pivotX: 0.5, pivotY: 1 }),
    color: "#1e3a8a",
    visible: true,
  },
  {
    id: "revive-frame",
    parentId: "consumables-frame",
    name: "Revive Frame",
    kind: "Frame",
    marker: "0x00109C3E",
    fields: elementFields({ x: "0x00109C4C" }, { x: 0.625, y: 1, width: 0.0416667, height: 0.0416667, pivotX: 0.5, pivotY: 1 }),
    color: "#172554",
    visible: true,
  },
  {
    id: "key-frame",
    parentId: "consumables-frame",
    name: "Key_Frame",
    kind: "Frame",
    marker: "0x00109C9F",
    fields: elementFields({ x: "0x00109CAD" }, { x: 0.875, y: 1, width: 0.0416667, height: 0.0416667, pivotX: 0.5, pivotY: 1 }),
    color: "#0f3c8a",
    visible: true,
  },
];

function mergeElementSchema(current: LayoutElement[]) {
  let changed = current.length !== initialElements.length;
  const currentById = new Map(current.map((element) => [element.id, element]));

  const next = initialElements.map((schemaElement) => {
    const currentElement = currentById.get(schemaElement.id);
    if (!currentElement) {
      changed = true;
      return schemaElement;
    }

    if (
      currentElement.parentId !== schemaElement.parentId ||
      currentElement.name !== schemaElement.name ||
      currentElement.marker !== schemaElement.marker ||
      currentElement.color !== schemaElement.color
    ) {
      changed = true;
    }

    const fields = Object.fromEntries(
      Object.entries(schemaElement.fields).map(([key, schemaField]) => {
        const fieldKey = key as keyof LayoutElement["fields"];
        const currentField = currentElement.fields[fieldKey];
        if (
          !currentField ||
          currentField.offset !== schemaField.offset ||
          currentField.defaultValue !== schemaField.defaultValue ||
          currentField.writable !== schemaField.writable
        ) {
          changed = true;
        }

        return [
          key,
          {
            ...schemaField,
            currentValue: currentField?.currentValue ?? schemaField.currentValue,
          },
        ];
      }),
    ) as LayoutElement["fields"];

    return {
      ...schemaElement,
      fields,
      visible: currentElement.visible,
    };
  });

  return changed ? next : current;
}

function frameAnchorY(value: number, screenHeight: number) {
  return value * screenHeight;
}

function normalizedFromRootAnchorX(x: number, screenWidth: number) {
  return x / screenWidth;
}

type WorldRect = {
  anchorX: number;
  anchorY: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

function getElement(elements: LayoutElement[], id: ElementId) {
  return elements.find((element) => element.id === id);
}

function getChildren(elements: LayoutElement[], parentId: ElementId | null) {
  return elements.filter((element) => element.parentId === parentId);
}

function isEffectivelyVisible(element: LayoutElement, elements: LayoutElement[]): boolean {
  if (!element.visible) {
    return false;
  }
  if (!element.parentId) {
    return true;
  }
  const parent = getElement(elements, element.parentId);
  return parent ? isEffectivelyVisible(parent, elements) : true;
}

function isAncestorHidden(element: LayoutElement, elements: LayoutElement[]): boolean {
  if (!element.parentId) {
    return false;
  }
  const parent = getElement(elements, element.parentId);
  if (!parent) {
    return false;
  }
  return !parent.visible || isAncestorHidden(parent, elements);
}

function worldRect(
  element: LayoutElement,
  elements: LayoutElement[],
  screenWidth: number,
  screenHeight: number,
): WorldRect {
  const parent = element.parentId ? getElement(elements, element.parentId) : null;
  const parentRect = parent ? worldRect(parent, elements, screenWidth, screenHeight) : null;
  const anchorX = parentRect
    ? parentRect.x + element.fields.x.currentValue * parentRect.width
    : element.fields.x.currentValue * screenWidth;
  const anchorY = parentRect
    ? parentRect.y + element.fields.y.currentValue * parentRect.height
    : frameAnchorY(element.fields.y.currentValue, screenHeight);
  const width = parentRect
    ? element.fields.width.currentValue * parentRect.width
    : element.fields.width.currentValue * screenHeight;
  const height = parentRect
    ? element.fields.height.currentValue * parentRect.height
    : element.fields.height.currentValue * screenHeight;

  return {
    anchorX,
    anchorY,
    x: anchorX - width * element.fields.pivotX.currentValue,
    y: anchorY - height * element.fields.pivotY.currentValue,
    width,
    height,
  };
}

function parseHexOffset(offset: string | null) {
  if (!offset) {
    return null;
  }
  return Number.parseInt(offset.replace(/^0x/i, ""), 16);
}

function writableLayoutOffsets(elements: LayoutElement[]) {
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

function formatFloat(value: number) {
  return value.toFixed(7).replace(/0+$/, "").replace(/\.$/, ".0");
}

function shortLabel(name: string) {
  return name
    .replace(/^HUD_Frame_/, "HUD ")
    .replace(/_Frame$/, "")
    .replace(/_Elements$/, "")
    .replace(/_/g, " ");
}

function App() {
  const shellRef = useRef<HTMLDivElement>(null);
  const canvasPanelRef = useRef<HTMLElement>(null);
  const [elements, setElements] = useState(initialElements);
  const [selectedId, setSelectedId] = useState<LayoutElement["id"]>("hud-right");
  const [monitors, setMonitors] = useState<MonitorInfo[]>([FALLBACK_MONITOR]);
  const [selectedMonitorId, setSelectedMonitorId] = useState(FALLBACK_MONITOR.id);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [canvasSize, setCanvasSize] = useState({ width: 640, height: 360 });
  const [showSafeArea, setShowSafeArea] = useState(true);
  const [presetMenuOpen, setPresetMenuOpen] = useState(false);
  const [gameState, setGameState] = useState<GameFolderState | null>(null);
  const [gameStateError, setGameStateError] = useState<string | null>(null);

  useEffect(() => {
    setElements((current) => mergeElementSchema(current));
  }, []);

  useEffect(() => {
    if (!gameState?.found || !gameState.gameDir) {
      return;
    }

    let cancelled = false;
    const gameDir = gameState.gameDir;

    async function loadLayoutValues() {
      const offsets = writableLayoutOffsets(initialElements);
      const values = await invoke<LayoutValue[]>("load_layout_values", {
        gameDir,
        requests: offsets.map((offset) => ({ offset })),
      });
      const valueByOffset = new Map(values.map((value) => [value.offset, value.value]));

      if (cancelled) {
        return;
      }

      setElements((current) =>
        mergeElementSchema(current).map((element) => ({
          ...element,
          fields: Object.fromEntries(
            Object.entries(element.fields).map(([key, field]) => {
              const offset = parseHexOffset(field.offset);
              return [
                key,
                {
                  ...field,
                  currentValue:
                    offset !== null && valueByOffset.has(offset)
                      ? valueByOffset.get(offset)!
                      : field.currentValue,
                },
              ];
            }),
          ) as LayoutElement["fields"],
        })),
      );
    }

    loadLayoutValues().catch((error) => {
      if (!cancelled) {
        setGameStateError(String(error));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [gameState?.found, gameState?.gameDir]);

  const selected = elements.find((element) => element.id === selectedId) ?? elements[0];
  const selectedMonitor =
    monitors.find((monitor) => monitor.id === selectedMonitorId) ?? monitors[0];
  const safeWidth = selectedMonitor.height * TARGET_ASPECT;
  const safeLeft = Math.max(0, (selectedMonitor.width - safeWidth) / 2);
  const normalizedInset = safeLeft / selectedMonitor.height;
  const availableStageWidth = Math.max(240, canvasSize.width - 36);
  const availableStageHeight = Math.max(160, canvasSize.height - 72);
  const stageScale = Math.min(
    availableStageWidth / selectedMonitor.width,
    availableStageHeight / selectedMonitor.height,
  );
  const stageWidth = Math.round(selectedMonitor.width * stageScale);
  const stageHeight = Math.round(selectedMonitor.height * stageScale);
  const scale = stageScale;

  const safeArea = useMemo(
    () => ({
      x: safeLeft * scale,
      y: 0,
      width: Math.min(safeWidth, selectedMonitor.width) * scale,
      height: selectedMonitor.height * scale,
    }),
    [safeLeft, safeWidth, scale, selectedMonitor.height, selectedMonitor.width],
  );

  useEffect(() => {
    async function loadGameState() {
      try {
        const state = await invoke<GameFolderState>("get_game_folder_state");
        setGameState(state);
        setGameStateError(null);
      } catch (error) {
        setGameState(null);
        setGameStateError(String(error));
      }
    }

    loadGameState();
  }, []);

  useEffect(() => {
    async function loadMonitors() {
      try {
        const nativeMonitors = await invoke<NativeMonitorInfo[]>("get_monitors");
        const nextMonitors = nativeMonitors.map((monitor) => ({
          id: monitor.id,
          name: monitor.name,
          width: monitor.width,
          height: monitor.height,
          x: monitor.x,
          y: monitor.y,
          scaleFactor: monitor.scale_factor,
          isPrimary: monitor.is_primary,
        }));
        if (nextMonitors.length === 0) {
          return;
        }
        setMonitors(nextMonitors);
        setSelectedMonitorId(
          nextMonitors.find((monitor) => monitor.isPrimary)?.id ?? nextMonitors[0].id,
        );
      } catch (error) {
        console.warn("Failed to load monitors from Tauri, using fallback monitor.", error);
      }
    }

    loadMonitors();
  }, []);

  async function browseGameFolder() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select Ravenswatch game folder",
    });

    if (typeof selected !== "string") {
      return;
    }

    try {
      const state = await invoke<GameFolderState>("set_game_folder", { gameDir: selected });
      setGameState(state);
      setGameStateError(null);
    } catch (error) {
      setGameState(null);
      setGameStateError(String(error));
    }
  }

  function resetToDefaults() {
    setElements((current) =>
      current.map((element) => ({
        ...element,
        fields: Object.fromEntries(
          Object.entries(element.fields).map(([key, value]) => [
            key,
            { ...value, currentValue: value.defaultValue },
          ]),
        ) as LayoutElement["fields"],
      })),
    );
  }

  function applySafeAreaPreset() {
    const safeAreaLeftX = safeLeft / selectedMonitor.width;
    const safeAreaRightX = (selectedMonitor.width - safeLeft) / selectedMonitor.width;

    setElements((current) =>
      current.map((element) => {
        if (element.id === "left-frame") {
          return {
            ...element,
            fields: {
              ...element.fields,
              x: {
                ...element.fields.x,
                currentValue: safeAreaLeftX,
              },
            },
          };
        }
        if (element.id === "right-frame") {
          return {
            ...element,
            fields: {
              ...element.fields,
              x: {
                ...element.fields.x,
                currentValue: safeAreaRightX,
              },
            },
          };
        }
        if (element.id === "hud-left" || element.id === "hud-right") {
          return {
            ...element,
            fields: {
              ...element.fields,
              x: {
                ...element.fields.x,
                currentValue: element.fields.x.defaultValue,
              },
            },
          };
        }
        return element;
      }),
    );
    setPresetMenuOpen(false);
  }

  async function saveLayout() {
    if (!gameState?.gameDir) {
      return;
    }

    const patches: LayoutPatch[] = elements.flatMap((element) =>
      Object.values(element.fields)
        .filter((field) => field.writable && field.offset)
        .map((field) => ({
          offset: parseHexOffset(field.offset) ?? 0,
          value: field.currentValue,
        })),
    );

    await invoke("save_layout_values", {
      gameDir: gameState.gameDir,
      patches,
    });
  }

  useEffect(() => {
    const node = canvasPanelRef.current;
    if (!node) {
      return;
    }

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setCanvasSize({ width: rect.width, height: rect.height });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function updateElementPosition(id: LayoutElement["id"], stageX: number, stageY: number) {
    setElements((current) =>
      current.map((element) => {
        if (element.id !== id) {
          return element;
        }

        const parent = element.parentId ? getElement(current, element.parentId) : null;
        const parentRect = parent
          ? worldRect(parent, current, selectedMonitor.width, selectedMonitor.height)
          : null;
        const worldX = stageX / scale;
        const worldY = stageY / scale;
        const nextX = parentRect
          ? (worldX - parentRect.x) / parentRect.width
          : normalizedFromRootAnchorX(worldX, selectedMonitor.width);
        const nextY = parentRect ? (worldY - parentRect.y) / parentRect.height : worldY / selectedMonitor.height;

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
      }),
    );
  }

  function updateElementField(
    id: LayoutElement["id"],
    fieldName: keyof LayoutElement["fields"],
    value: number,
  ) {
    if (!Number.isFinite(value)) {
      return;
    }

    setElements((current) =>
      current.map((element) =>
        element.id === id
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
      ),
    );
  }

  function toggleSection(id: string) {
    setCollapsedSections((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  function toggleElementVisibility(id: ElementId) {
    setElements((current) =>
      current.map((element) =>
        element.id === id ? { ...element, visible: !element.visible } : element,
      ),
    );
  }

  function renderElementTree(parentId: ElementId | null = null, depth = 0): ReactNode {
    return getChildren(elements, parentId).map((element) => {
      const children = getChildren(elements, element.id);
      const collapsed = Boolean(collapsedSections[`tree:${element.id}`]);
      const effectiveVisible = isEffectivelyVisible(element, elements);
      const mutedByParent = element.visible && isAncestorHidden(element, elements);

      return (
        <div className="tree-node" key={element.id}>
          <div
            className={[
              "tree-row",
              element.id === selectedId ? "active" : "",
              effectiveVisible ? "" : "hidden",
              mutedByParent ? "muted" : "",
            ].join(" ")}
            style={{ paddingLeft: 6 + depth * 16 }}
          >
            <button
              className="tree-expander"
              disabled={children.length === 0}
              onClick={() => toggleSection(`tree:${element.id}`)}
              type="button"
            >
              {children.length > 0 ? (
                collapsed ? (
                  <IconChevronRight size={14} stroke={2} />
                ) : (
                  <IconChevronDown size={14} stroke={2} />
                )
              ) : null}
            </button>
            <button
              className="tree-eye"
              onClick={() => toggleElementVisibility(element.id)}
              type="button"
            >
              {element.visible ? <IconEye size={15} stroke={2} /> : <IconEyeOff size={15} stroke={2} />}
            </button>
            <button
              className="tree-label"
              onClick={() => setSelectedId(element.id)}
              type="button"
            >
              <span className="swatch" style={{ background: element.color }} />
              <span>{element.name}</span>
            </button>
          </div>
          {!collapsed && children.length > 0 ? renderElementTree(element.id, depth + 1) : null}
        </div>
      );
    });
  }

  function sectionHeader(id: string, title: string) {
    const collapsed = Boolean(collapsedSections[id]);
    return (
      <button className="section-header" onClick={() => toggleSection(id)} type="button">
        <span>{title}</span>
        {collapsed ? (
          <IconChevronRight className="section-arrow" size={16} stroke={2} />
        ) : (
          <IconChevronDown className="section-arrow" size={16} stroke={2} />
        )}
      </button>
    );
  }

  return (
    <main className="app" ref={shellRef}>
      <header className="toolbar">
        {gameState?.found && (
          <div className="header-content">
            <button className="game-folder-bar" onClick={browseGameFolder} type="button">
              <IconFolder className="game-folder-icon" size={18} stroke={2} />
              <span className="game-folder-tooltip">{gameState.gameDir}</span>
            </button>
            <div className="header-actions">
              <div className="preset-menu">
                <button
                  className="header-action secondary"
                  onClick={() => setPresetMenuOpen((open) => !open)}
                  type="button"
                >
                  Presets
                </button>
                {presetMenuOpen && (
                  <div className="preset-popover">
                    <button onClick={applySafeAreaPreset} type="button">
                      16:9 Safe Area
                    </button>
                  </div>
                )}
              </div>
              <button className="header-action secondary" onClick={resetToDefaults} type="button">
                Reset Defaults
              </button>
              <button className="header-action primary" onClick={saveLayout} type="button">
                Save
              </button>
            </div>
          </div>
        )}
      </header>

      {gameState === null && gameStateError === null ? (
        <section className="empty-state">
          <div className="empty-card">
            <h2>Detecting game folder</h2>
            <p>Checking the saved folder, current folder, executable folder, and default Steam path.</p>
          </div>
        </section>
      ) : gameState?.found ? (
      <section className="workspace">
        <aside className="left-panel">
          <div className="property-section">
            {sectionHeader("monitor", "Monitor")}
            {!collapsedSections.monitor && (
              <div className="section-content">
                <label className="field">
                  <span>Display</span>
                  <select
                    value={selectedMonitorId}
                    onChange={(event) => setSelectedMonitorId(event.currentTarget.value)}
                  >
                    {monitors.map((monitor, index) => (
                      <option key={monitor.id} value={monitor.id}>
                        {monitor.name || `Display ${index + 1}`} - {monitor.width}x{monitor.height}
                        {monitor.isPrimary ? " - Primary" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <dl className="props">
                  <dt>Resolution</dt>
                  <dd>
                    {selectedMonitor.width}x{selectedMonitor.height}
                  </dd>
                  <dt>Position</dt>
                  <dd>
                    {selectedMonitor.x}, {selectedMonitor.y}
                  </dd>
                  <dt>Scale</dt>
                  <dd>{formatFloat(selectedMonitor.scaleFactor)}</dd>
                  <dt>16:9 Inset</dt>
                  <dd>{formatFloat(normalizedInset)}</dd>
                </dl>
              </div>
            )}
          </div>

          <div className="property-section">
            {sectionHeader("elements", "Elements")}
            {!collapsedSections.elements && (
              <div className="section-content">
                <div className="element-tree">{renderElementTree()}</div>
              </div>
            )}
          </div>
        </aside>

        <section className="canvas-panel" ref={canvasPanelRef}>
          <div className="layout-header">
            <span>Layout</span>
            <label className="toggle-field">
              <input
                checked={showSafeArea}
                onChange={(event) => setShowSafeArea(event.currentTarget.checked)}
                type="checkbox"
              />
              <span>16:9 Safe Area</span>
            </label>
          </div>
          <div className="stage-shell">
            <Stage width={stageWidth} height={stageHeight}>
              <Layer>
                <Rect width={stageWidth} height={stageHeight} fill="#111827" />
                <Rect
                  x={0}
                  y={0}
                  width={stageWidth}
                  height={stageHeight}
                  stroke="#e5e7eb"
                  strokeWidth={1}
                  opacity={0.72}
                />
                {showSafeArea && (
                  <Rect
                    x={safeArea.x}
                    y={safeArea.y}
                    width={safeArea.width}
                    height={safeArea.height}
                    stroke="#93c5fd"
                    strokeWidth={1}
                    dash={[8, 5]}
                    opacity={0.95}
                  />
                )}
                <Line
                  points={[stageWidth / 2, 0, stageWidth / 2, stageHeight]}
                  stroke="#64748b"
                  dash={[6, 6]}
                />
                {elements.filter((element) => isEffectivelyVisible(element, elements)).map((element) => {
                  const rect = worldRect(element, elements, selectedMonitor.width, selectedMonitor.height);
                  const x = rect.anchorX * scale;
                  const y = rect.anchorY * scale;
                  const handleSize = element.parentId === null ? 26 : 20;
                  const extent = rect;
                  return (
                    <Group
                      key={element.id}
                      draggable
                      x={x}
                      y={y}
                      onClick={() => setSelectedId(element.id)}
                      onTap={() => setSelectedId(element.id)}
                      onDragMove={(event) =>
                        updateElementPosition(element.id, event.target.x(), event.target.y())
                      }
                    >
                      <Rect
                        x={(extent.x - x / scale) * scale}
                        y={(extent.y - y / scale) * scale}
                        width={extent.width * scale}
                        height={extent.height * scale}
                        stroke={element.color}
                        strokeWidth={1}
                        opacity={element.id === selectedId ? 0.78 : 0.28}
                      />
                      <Rect
                        x={-handleSize / 2}
                        y={-handleSize / 2}
                        width={handleSize}
                        height={handleSize}
                        fill={element.color}
                        opacity={element.id === selectedId ? 0.55 : 0.32}
                        stroke={element.color}
                        strokeWidth={element.id === selectedId ? 3 : 2}
                        cornerRadius={4}
                      />
                      <Line
                        points={[-34, 0, 34, 0]}
                        stroke={element.color}
                        strokeWidth={1}
                        opacity={0.75}
                      />
                      <Line
                        points={[0, -34, 0, 34]}
                        stroke={element.color}
                        strokeWidth={1}
                        opacity={0.75}
                      />
                      <Text
                        x={16}
                        y={-26}
                        fill="#f8fafc"
                        fontSize={14}
                        text={shortLabel(element.name)}
                      />
                    </Group>
                  );
                })}
              </Layer>
            </Stage>
          </div>
        </section>

        <aside className="panel">
          <div className="property-section">
            {sectionHeader("selection", "Selection")}
            {!collapsedSections.selection && (
              <div className="section-content">
                <dl className="props">
                  <dt>Type</dt>
                  <dd>{selected.kind}</dd>
                  <dt>Name</dt>
                  <dd>{selected.name}</dd>
                  <dt>Marker</dt>
                  <dd>{selected.marker}</dd>
                  <dt>X Offset</dt>
                  <dd>{selected.fields.x.offset ?? "-"}</dd>
                  <dt>Original X</dt>
                  <dd>{formatFloat(selected.fields.x.defaultValue)}</dd>
                  <dt>X</dt>
                  <dd>
                    <input
                      className="number-input"
                      onChange={(event) =>
                        updateElementField(selected.id, "x", event.currentTarget.valueAsNumber)
                      }
                      step="0.001"
                      type="number"
                      value={formatFloat(selected.fields.x.currentValue)}
                    />
                  </dd>
                  <dt>Y</dt>
                  <dd>
                    <input
                      className="number-input"
                      onChange={(event) =>
                        updateElementField(selected.id, "y", event.currentTarget.valueAsNumber)
                      }
                      step="0.001"
                      type="number"
                      value={formatFloat(selected.fields.y.currentValue)}
                    />
                  </dd>
                  <dt>Width</dt>
                  <dd>
                    <input
                      className="number-input"
                      min="0"
                      onChange={(event) =>
                        updateElementField(selected.id, "width", event.currentTarget.valueAsNumber)
                      }
                      step="0.001"
                      type="number"
                      value={formatFloat(selected.fields.width.currentValue)}
                    />
                  </dd>
                  <dt>Height</dt>
                  <dd>
                    <input
                      className="number-input"
                      min="0"
                      onChange={(event) =>
                        updateElementField(selected.id, "height", event.currentTarget.valueAsNumber)
                      }
                      step="0.001"
                      type="number"
                      value={formatFloat(selected.fields.height.currentValue)}
                    />
                  </dd>
                  <dt>Pivot X</dt>
                  <dd>
                    <input
                      className="number-input"
                      onChange={(event) =>
                        updateElementField(selected.id, "pivotX", event.currentTarget.valueAsNumber)
                      }
                      step="0.001"
                      type="number"
                      value={formatFloat(selected.fields.pivotX.currentValue)}
                    />
                  </dd>
                  <dt>Pivot Y</dt>
                  <dd>
                    <input
                      className="number-input"
                      onChange={(event) =>
                        updateElementField(selected.id, "pivotY", event.currentTarget.valueAsNumber)
                      }
                      step="0.001"
                      type="number"
                      value={formatFloat(selected.fields.pivotY.currentValue)}
                    />
                  </dd>
                  <dt>Delta px</dt>
                  <dd>
                    {Math.round(
                      (selected.fields.x.currentValue - selected.fields.x.defaultValue) *
                        selectedMonitor.height,
                    )}
                  </dd>
                </dl>
              </div>
            )}
          </div>
        </aside>
      </section>
      ) : (
        <section className="empty-state">
          <div className="empty-card">
            <h2>Game folder not detected</h2>
            <p>
              {gameStateError ??
                gameState?.message ??
                "Ravenswatch was not detected in the default Steam install path."}
            </p>
            <button onClick={browseGameFolder} type="button">
              Browse Game Folder
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
