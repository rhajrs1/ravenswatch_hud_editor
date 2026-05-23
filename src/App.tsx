import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import "./App.css";

import { LayoutCanvas } from "./features/layout-editor/canvas/LayoutCanvas";
import { ElementTreeSection } from "./features/layout-editor/element-tree/ElementTree";
import { AppHeader } from "./features/layout-editor/header/AppHeader";
import { parseHexOffset, readLayoutValues, saveLayoutValues } from "./features/layout-editor/model/persistence";
import { initialElements, mergeElementSchema } from "./features/layout-editor/model/schema";
import type { ElementId, GameFolderState, LayoutElement, MonitorInfo, NativeMonitorInfo } from "./features/layout-editor/model/types";
import { MonitorSection } from "./features/layout-editor/monitor/MonitorSection";
import { PropertyPanel } from "./features/layout-editor/properties/PropertyPanel";

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

function App() {
  const shellRef = useRef<HTMLDivElement>(null);
  const [elements, setElements] = useState(initialElements);
  const [selectedId, setSelectedId] = useState<LayoutElement["id"]>("hud-right");
  const [monitors, setMonitors] = useState<MonitorInfo[]>([FALLBACK_MONITOR]);
  const [selectedMonitorId, setSelectedMonitorId] = useState(FALLBACK_MONITOR.id);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
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
      const values = await readLayoutValues(gameDir, initialElements);
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
              x: { ...element.fields.x, currentValue: safeAreaLeftX },
            },
          };
        }
        if (element.id === "right-frame") {
          return {
            ...element,
            fields: {
              ...element.fields,
              x: { ...element.fields.x, currentValue: safeAreaRightX },
            },
          };
        }
        if (element.id === "hud-left" || element.id === "hud-right") {
          return {
            ...element,
            fields: {
              ...element.fields,
              x: { ...element.fields.x, currentValue: element.fields.x.defaultValue },
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
    await saveLayoutValues(gameState.gameDir, elements);
  }

  function updateElementPosition(id: LayoutElement["id"], nextX: number, nextY: number) {
    setElements((current) =>
      current.map((element) => {
        if (element.id !== id) {
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



  return (
    <main className="app" ref={shellRef}>
      <AppHeader
        gameState={gameState}
        presetMenuOpen={presetMenuOpen}
        onApplySafeAreaPreset={applySafeAreaPreset}
        onBrowseGameFolder={browseGameFolder}
        onResetDefaults={resetToDefaults}
        onSaveLayout={saveLayout}
        onTogglePresetMenu={() => setPresetMenuOpen((open) => !open)}
      />

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
          <MonitorSection
            collapsedSections={collapsedSections}
            monitors={monitors}
            normalizedInset={normalizedInset}
            selectedMonitor={selectedMonitor}
            selectedMonitorId={selectedMonitorId}
            onMonitorChange={setSelectedMonitorId}
            onToggleSection={toggleSection}
          />
          <ElementTreeSection
            collapsedSections={collapsedSections}
            elements={elements}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onToggleElementVisibility={toggleElementVisibility}
            onToggleSection={toggleSection}
          />
        </aside>

        <LayoutCanvas
          elements={elements}
          selectedId={selectedId}
          selectedMonitor={selectedMonitor}
          showSafeArea={showSafeArea}
          onMoveElement={updateElementPosition}
          onSelect={setSelectedId}
          onShowSafeAreaChange={setShowSafeArea}
        />

        <PropertyPanel
          collapsedSections={collapsedSections}
          selected={selected}
          selectedMonitor={selectedMonitor}
          onToggleSection={toggleSection}
          onUpdateElementField={updateElementField}
        />
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
