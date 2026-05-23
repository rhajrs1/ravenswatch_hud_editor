import type { LayoutElement, LayoutField } from "./types";

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



export const initialElements: LayoutElement[] = [
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

export function mergeElementSchema(current: LayoutElement[]) {
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