import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { IconChevronDown, IconChevronRight, IconFolder } from "@tabler/icons-react";
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

type LayoutElement = {
  id: "left" | "right" | "center";
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
};

type LayoutPatch = {
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

const defaultFrameFields = (xOffset: string | null, currentX = 0.5): LayoutElement["fields"] => ({
  x: field(xOffset, 0.5, currentX, Boolean(xOffset)),
  y: field(null, 0.5, 0.5, false),
  width: field(null, 1, 1, false),
  height: field(null, 1, 1, false),
  pivotX: field(null, 0.5, 0.5, false),
  pivotY: field(null, 0.5, 0.5, false),
});

const initialElements: LayoutElement[] = [
  {
    id: "left",
    name: "HUD_Frame_Left",
    kind: "Frame",
    marker: "0x00103C9D",
    fields: defaultFrameFields("0x00103CAB", 1.3888889),
    color: "#31c48d",
  },
  {
    id: "center",
    name: "HUD_Frame_Center",
    kind: "Frame",
    marker: "0x0010655F",
    fields: defaultFrameFields(null, 0.5),
    color: "#f59e0b",
  },
  {
    id: "right",
    name: "HUD_Frame_Right",
    kind: "Frame",
    marker: "0x001098B7",
    fields: defaultFrameFields("0x001098C5", -0.3888889),
    color: "#60a5fa",
  },
];

function frameAnchorX(value: number, screenWidth: number, screenHeight: number) {
  return screenWidth / 2 + (value - 0.5) * screenHeight;
}

function frameAnchorY(value: number, screenHeight: number) {
  return value * screenHeight;
}

function normalizedFromAnchorX(x: number, screenWidth: number, screenHeight: number) {
  return 0.5 + (x - screenWidth / 2) / screenHeight;
}

function normalizedExtent(element: LayoutElement, screenWidth: number, screenHeight: number) {
  const anchorX = frameAnchorX(element.fields.x.currentValue, screenWidth, screenHeight);
  const anchorY = frameAnchorY(element.fields.y.currentValue, screenHeight);
  const width = element.fields.width.currentValue * screenHeight;
  const height = element.fields.height.currentValue * screenHeight;

  return {
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

function formatFloat(value: number) {
  return value.toFixed(7).replace(/0+$/, "").replace(/\.$/, ".0");
}

function App() {
  const shellRef = useRef<HTMLDivElement>(null);
  const canvasPanelRef = useRef<HTMLElement>(null);
  const [elements, setElements] = useState(initialElements);
  const [selectedId, setSelectedId] = useState<LayoutElement["id"]>("right");
  const [monitors, setMonitors] = useState<MonitorInfo[]>([FALLBACK_MONITOR]);
  const [selectedMonitorId, setSelectedMonitorId] = useState(FALLBACK_MONITOR.id);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [canvasSize, setCanvasSize] = useState({ width: 640, height: 360 });
  const [showSafeArea, setShowSafeArea] = useState(true);
  const [presetMenuOpen, setPresetMenuOpen] = useState(false);
  const [gameState, setGameState] = useState<GameFolderState | null>(null);
  const [gameStateError, setGameStateError] = useState<string | null>(null);

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
    const inset = safeLeft / selectedMonitor.height;
    setElements((current) =>
      current.map((element) => {
        if (element.id === "left") {
          return {
            ...element,
            fields: {
              ...element.fields,
              x: {
                ...element.fields.x,
                currentValue: element.fields.x.defaultValue + inset,
              },
            },
          };
        }
        if (element.id === "right") {
          return {
            ...element,
            fields: {
              ...element.fields,
              x: {
                ...element.fields.x,
                currentValue: element.fields.x.defaultValue - inset,
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

  function updateElementX(id: LayoutElement["id"], stageX: number) {
    setElements((current) =>
      current.map((element) =>
        element.id === id
          ? {
              ...element,
              fields: {
                ...element.fields,
                x: {
                  ...element.fields.x,
                  currentValue: normalizedFromAnchorX(
                    stageX / scale,
                    selectedMonitor.width,
                    selectedMonitor.height,
                  ),
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
                  <dt>Game Dir</dt>
                  <dd>{gameState.gameDir}</dd>
                </dl>
              </div>
            )}
          </div>

          <div className="property-section">
            {sectionHeader("elements", "Elements")}
            {!collapsedSections.elements && (
              <div className="section-content">
                <div className="element-list">
                  {elements.map((element) => (
                    <button
                      className={element.id === selectedId ? "element-row active" : "element-row"}
                      key={element.id}
                      onClick={() => setSelectedId(element.id)}
                      type="button"
                    >
                      <span className="swatch" style={{ background: element.color }} />
                      <span>{element.name}</span>
                    </button>
                  ))}
                </div>
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
                {elements.map((element) => {
                  const x =
                    frameAnchorX(
                      element.fields.x.currentValue,
                      selectedMonitor.width,
                      selectedMonitor.height,
                    ) * scale;
                  const y = frameAnchorY(element.fields.y.currentValue, selectedMonitor.height) * scale;
                  const handleSize = element.id === "center" ? 20 : 26;
                  const extent = normalizedExtent(
                    element,
                    selectedMonitor.width,
                    selectedMonitor.height,
                  );
                  return (
                    <Group
                      key={element.id}
                      draggable={element.id !== "center"}
                      x={x}
                      y={y}
                      onClick={() => setSelectedId(element.id)}
                      onTap={() => setSelectedId(element.id)}
                      onDragMove={(event) => updateElementX(element.id, event.target.x())}
                      dragBoundFunc={(pos) => ({ x: pos.x, y })}
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
                        text={`${element.name}\nanchor X ${formatFloat(element.fields.x.currentValue)}`}
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
                  <dt>Y</dt>
                  <dd>{formatFloat(selected.fields.y.currentValue)}</dd>
                  <dt>Width</dt>
                  <dd>{formatFloat(selected.fields.width.currentValue)}</dd>
                  <dt>Height</dt>
                  <dd>{formatFloat(selected.fields.height.currentValue)}</dd>
                  <dt>Pivot</dt>
                  <dd>
                    {formatFloat(selected.fields.pivotX.currentValue)},{" "}
                    {formatFloat(selected.fields.pivotY.currentValue)}
                  </dd>
                  <dt>Current X</dt>
                  <dd>{formatFloat(selected.fields.x.currentValue)}</dd>
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
