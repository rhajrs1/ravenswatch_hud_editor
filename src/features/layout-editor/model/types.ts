export type MonitorInfo = {
  id: string;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  scaleFactor: number;
  isPrimary: boolean;
};

export type NativeMonitorInfo = {
  id: string;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  scale_factor: number;
  is_primary: boolean;
};

export type GameFolderState = {
  found: boolean;
  gameDir: string | null;
  layoutPath: string | null;
  source: string;
  message: string;
};

export type LayoutField = {
  offset: string | null;
  defaultValue: number;
  currentValue: number;
  writable: boolean;
};

export type WidthBasis = {
  offset: string;
  rawValue: number;
  basis: "parentWidth" | "parentHeight";
};

export type LayoutRecord = {
  marker: number;
  label: string;
  kind: number;
  flagX: number;
  flagY: number;
  widthBasisRaw: number;
  x: number;
  y: number;
  width: number;
  height: number;
  pivotX: number;
  pivotY: number;
};

export type ElementId =
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
  | "dash-layout-top"
  | "trait-layout-top"
  | "basic-layout-top"
  | "primary-layout-top"
  | "secondary-layout-top"
  | "defensive-layout-top"
  | "ultimate-layout-top"
  | "trait-layout"
  | "basic-layout"
  | "primary-layout"
  | "secondary-layout"
  | "defensive-layout"
  | "ultimate-layout"
  | "trait-layout-back"
  | "basic-layout-back"
  | "primary-layout-back"
  | "secondary-layout-back"
  | "defensive-layout-back"
  | "ultimate-layout-back"
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
  | "melodies"
  | "consumables-frame"
  | "dream-shards-frame"
  | "reroll-frame"
  | "revive-frame"
  | "key-frame"
  | "note-frame";

export type LayoutElement = {
  id: ElementId;
  parentId: ElementId | null;
  name: string;
  kind: "Frame";
  marker: string;
  widthBasis: WidthBasis;
  availability?: "available" | "unavailable";
  unavailableReason?: string;
  fields: {
    x: LayoutField;
    y: LayoutField;
    width: LayoutField;
    height: LayoutField;
    pivotX: LayoutField;
    pivotY: LayoutField;
  };
  color: string;
  hidden?: boolean;
  visible: boolean;
};

export type LayoutPatch = {
  offset: number;
  value: number;
};

export type LayoutValue = {
  offset: number;
  value: number;
};


export type WorldRect = {
  anchorX: number;
  anchorY: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

