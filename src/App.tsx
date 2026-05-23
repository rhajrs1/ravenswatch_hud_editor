import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
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

type HudFrame = {
  id: "left" | "right" | "center";
  name: string;
  marker: string;
  offset: string;
  originalX: number;
  currentX: number;
  color: string;
  width: number;
  height: number;
  y: number;
};

const initialFrames: HudFrame[] = [
  {
    id: "left",
    name: "HUD_Frame_Left",
    marker: "0x00103C9D",
    offset: "0x00103CAB",
    originalX: 0.5,
    currentX: 1.3888889,
    color: "#31c48d",
    width: 520,
    height: 250,
    y: 1110,
  },
  {
    id: "center",
    name: "HUD_Frame_Center",
    marker: "0x0010655F",
    offset: "-",
    originalX: 0.5,
    currentX: 0.5,
    color: "#f59e0b",
    width: 1040,
    height: 180,
    y: 1145,
  },
  {
    id: "right",
    name: "HUD_Frame_Right",
    marker: "0x001098B7",
    offset: "0x001098C5",
    originalX: 0.5,
    currentX: -0.3888889,
    color: "#60a5fa",
    width: 620,
    height: 520,
    y: 775,
  },
];

function frameX(value: number, width: number, screenWidth: number, screenHeight: number) {
  return screenWidth / 2 + (value - 0.5) * screenHeight - width / 2;
}

function normalizedFromX(x: number, width: number, screenWidth: number, screenHeight: number) {
  return 0.5 + (x + width / 2 - screenWidth / 2) / screenHeight;
}

function formatFloat(value: number) {
  return value.toFixed(7).replace(/0+$/, "").replace(/\.$/, ".0");
}

function App() {
  const shellRef = useRef<HTMLDivElement>(null);
  const canvasPanelRef = useRef<HTMLElement>(null);
  const [frames, setFrames] = useState(initialFrames);
  const [selectedId, setSelectedId] = useState<HudFrame["id"]>("right");
  const [monitors, setMonitors] = useState<MonitorInfo[]>([FALLBACK_MONITOR]);
  const [selectedMonitorId, setSelectedMonitorId] = useState(FALLBACK_MONITOR.id);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [canvasSize, setCanvasSize] = useState({ width: 640, height: 360 });

  const selected = frames.find((frame) => frame.id === selectedId) ?? frames[0];
  const selectedMonitor =
    monitors.find((monitor) => monitor.id === selectedMonitorId) ?? monitors[0];
  const safeWidth = selectedMonitor.height * TARGET_ASPECT;
  const safeLeft = Math.max(0, (selectedMonitor.width - safeWidth) / 2);
  const normalizedInset = safeLeft / selectedMonitor.height;
  const availableStageWidth = Math.max(240, canvasSize.width - 36);
  const availableStageHeight = Math.max(160, canvasSize.height - 36);
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

  function updateFrameX(id: HudFrame["id"], stageX: number) {
    setFrames((current) =>
      current.map((frame) =>
        frame.id === id
          ? {
              ...frame,
              currentX: normalizedFromX(
                stageX / scale,
                frame.width,
                selectedMonitor.width,
                selectedMonitor.height,
              ),
            }
          : frame,
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
        <div>
          <h1>Ravenswatch HUD Layout Editor</h1>
          <p>
            {selectedMonitor.width}x{selectedMonitor.height} / 16:9 safe area /
            height-normalized coordinates
          </p>
        </div>
      </header>

      <section className="workspace">
        <aside className="left-panel">
          <div className="property-section">
            {sectionHeader("elements", "Elements")}
            {!collapsedSections.elements && (
              <div className="section-content">
                <div className="element-list">
                  {frames.map((frame) => (
                    <button
                      className={frame.id === selectedId ? "element-row active" : "element-row"}
                      key={frame.id}
                      onClick={() => setSelectedId(frame.id)}
                      type="button"
                    >
                      <span className="swatch" style={{ background: frame.color }} />
                      <span>{frame.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        <section className="canvas-panel" ref={canvasPanelRef}>
          <div className="stage-shell">
            <Stage width={stageWidth} height={stageHeight}>
              <Layer>
                <Rect width={stageWidth} height={stageHeight} fill="#111827" />
                <Rect
                  x={safeArea.x}
                  y={safeArea.y}
                  width={safeArea.width}
                  height={safeArea.height}
                  fill="#172554"
                  opacity={0.35}
                  stroke="#93c5fd"
                  strokeWidth={1}
                />
                <Line
                  points={[stageWidth / 2, 0, stageWidth / 2, stageHeight]}
                  stroke="#64748b"
                  dash={[6, 6]}
                />
                {frames.map((frame) => {
                  const x =
                    frameX(
                      frame.currentX,
                      frame.width,
                      selectedMonitor.width,
                      selectedMonitor.height,
                    ) * scale;
                  const y = frame.y * scale;
                  const width = frame.width * scale;
                  const height = frame.height * scale;
                  return (
                    <Group
                      key={frame.id}
                      draggable={frame.id !== "center"}
                      x={x}
                      y={y}
                      onClick={() => setSelectedId(frame.id)}
                      onTap={() => setSelectedId(frame.id)}
                      onDragMove={(event) => updateFrameX(frame.id, event.target.x())}
                      dragBoundFunc={(pos) => ({ x: pos.x, y })}
                    >
                      <Rect
                        width={width}
                        height={height}
                        fill={frame.color}
                        opacity={frame.id === selectedId ? 0.28 : 0.16}
                        stroke={frame.color}
                        strokeWidth={frame.id === selectedId ? 3 : 2}
                        cornerRadius={4}
                      />
                      <Text
                        x={10}
                        y={10}
                        fill="#f8fafc"
                        fontSize={14}
                        text={`${frame.name}\nX ${formatFloat(frame.currentX)}`}
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
            {sectionHeader("selection", "Selection")}
            {!collapsedSections.selection && (
              <div className="section-content">
                <dl className="props">
                  <dt>Type</dt>
                  <dd>Frame</dd>
                  <dt>Name</dt>
                  <dd>{selected.name}</dd>
                  <dt>Marker</dt>
                  <dd>{selected.marker}</dd>
                  <dt>X Offset</dt>
                  <dd>{selected.offset}</dd>
                  <dt>Original X</dt>
                  <dd>{formatFloat(selected.originalX)}</dd>
                  <dt>Current X</dt>
                  <dd>{formatFloat(selected.currentX)}</dd>
                  <dt>Delta px</dt>
                  <dd>
                    {Math.round((selected.currentX - selected.originalX) * selectedMonitor.height)}
                  </dd>
                </dl>
              </div>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}

export default App;
