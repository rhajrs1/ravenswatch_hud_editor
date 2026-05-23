import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { confirm, open, save } from "@tauri-apps/plugin-dialog";
import "./App.css";

import { LayoutCanvas } from "./features/layout-editor/canvas/LayoutCanvas";
import { ElementTreeSection } from "./features/layout-editor/element-tree/ElementTree";
import { AppHeader } from "./features/layout-editor/header/AppHeader";
import { applyLayoutCommand, createLayoutCommand } from "./features/layout-editor/history/layoutHistoryModel";
import type { LayoutCommand, LayoutFieldChange, LayoutFieldName } from "./features/layout-editor/history/layoutHistoryModel";
import { backupLayoutFile, parseHexOffset, readLayoutValues, restoreLayoutFile, saveLayoutValues } from "./features/layout-editor/model/persistence";
import { initialElements, mergeElementSchema } from "./features/layout-editor/model/schema";
import type { ElementId, GameFolderState, LayoutElement, MonitorInfo, NativeMonitorInfo } from "./features/layout-editor/model/types";
import { MonitorSection } from "./features/layout-editor/monitor/MonitorSection";
import { PropertyPanel } from "./features/layout-editor/properties/PropertyPanel";

const TARGET_ASPECT = 16 / 9;
const MAX_HISTORY = 100;
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

function pushHistory(stack: LayoutCommand[], command: LayoutCommand) {
  return [...stack, command].slice(-MAX_HISTORY);
}

function App() {
  const shellRef = useRef<HTMLDivElement>(null);
  const [elements, setElements] = useState(initialElements);
  const [selectedId, setSelectedId] = useState<LayoutElement["id"]>("hud-right");
  const [monitors, setMonitors] = useState<MonitorInfo[]>([FALLBACK_MONITOR]);
  const [selectedMonitorId, setSelectedMonitorId] = useState(FALLBACK_MONITOR.id);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [showSafeArea, setShowSafeArea] = useState(true);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [presetMenuOpen, setPresetMenuOpen] = useState(false);
  const [gameState, setGameState] = useState<GameFolderState | null>(null);
  const [gameStateError, setGameStateError] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<LayoutCommand[]>([]);
  const [redoStack, setRedoStack] = useState<LayoutCommand[]>([]);

  useEffect(() => {
    setElements((current) => mergeElementSchema(current));
  }, []);

  async function reloadLayoutValuesFromDisk(gameDir: string) {
    const values = await readLayoutValues(gameDir, initialElements);
    const valueByOffset = new Map(values.map((value) => [value.offset, value.value]));

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
    setUndoStack([]);
    setRedoStack([]);
  }

  useEffect(() => {
    if (!gameState?.found || !gameState.gameDir) {
      return;
    }

    let cancelled = false;
    const gameDir = gameState.gameDir;

    async function loadLayoutValues() {
      if (cancelled) {
        return;
      }

      await reloadLayoutValuesFromDisk(gameDir);
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

  function backupFileName() {
    const now = new Date();
    const stamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
      "-",
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
      String(now.getSeconds()).padStart(2, "0"),
    ].join("");
    return `Ravenswatch-HUD-Layout-Backup-${stamp}.yqz`;
  }

  async function backupSavedFile() {
    if (!gameState?.gameDir) {
      return;
    }

    const targetPath = await save({
      defaultPath: backupFileName(),
      filters: [{ name: "Ravenswatch Layout", extensions: ["yqz"] }],
      title: "Backup saved Ravenswatch layout file",
    });

    if (typeof targetPath !== "string") {
      return;
    }

    await backupLayoutFile(gameState.gameDir, targetPath);
    setFileMenuOpen(false);
  }

  async function restoreFile() {
    if (!gameState?.gameDir) {
      return;
    }

    const backupPath = await open({
      filters: [{ name: "Ravenswatch Layout", extensions: ["yqz"] }],
      multiple: false,
      title: "Restore Ravenswatch layout file",
    });

    if (typeof backupPath !== "string") {
      return;
    }

    const confirmed = await confirm(
      "This will replace the current saved game layout file on disk.\nUnsaved editor changes will be discarded.",
      {
        kind: "warning",
        okLabel: "Restore File",
        cancelLabel: "Cancel",
        title: "Restore selected backup?",
      },
    );

    if (!confirmed) {
      return;
    }

    await restoreLayoutFile(gameState.gameDir, backupPath);
    await reloadLayoutValuesFromDisk(gameState.gameDir);
    setFileMenuOpen(false);
  }

  function resetToDefaults() {
    const command = createLayoutCommand(
      "Reset Defaults",
      elements.flatMap((element) =>
        (Object.keys(element.fields) as LayoutFieldName[]).map((field) => ({
          elementId: element.id,
          field,
          before: element.fields[field].currentValue,
          after: element.fields[field].defaultValue,
        })),
      ),
    );
    if (!command) {
      return;
    }

    commitCommand(command);
  }

  function applySafeAreaPreset() {
    const safeAreaLeftX = safeLeft / selectedMonitor.width;
    const safeAreaRightX = (selectedMonitor.width - safeLeft) / selectedMonitor.width;
    const changes: LayoutFieldChange[] = elements.flatMap((element): LayoutFieldChange[] => {
      if (element.id === "left-frame") {
        return [{
          elementId: element.id,
          field: "x" as const,
          before: element.fields.x.currentValue,
          after: safeAreaLeftX,
        }];
      }
      if (element.id === "right-frame") {
        return [{
          elementId: element.id,
          field: "x" as const,
          before: element.fields.x.currentValue,
          after: safeAreaRightX,
        }];
      }
      if (element.id === "hud-left" || element.id === "hud-right") {
        return [{
          elementId: element.id,
          field: "x" as const,
          before: element.fields.x.currentValue,
          after: element.fields.x.defaultValue,
        }];
      }
      return [];
    });
    const command = createLayoutCommand("Apply 16:9 Safe Area", changes);
    if (command) {
      commitCommand(command);
    }

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

  function commitElementMove(id: LayoutElement["id"], before: { x: number; y: number }, after: { x: number; y: number }) {
    const command = createLayoutCommand("Move Element", [
      {
        elementId: id,
        field: "x",
        before: before.x,
        after: after.x,
      },
      {
        elementId: id,
        field: "y",
        before: before.y,
        after: after.y,
      },
    ]);

    if (command) {
      setUndoStack((current) => pushHistory(current, command));
      setRedoStack([]);
    }
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

  function commitElementField(
    id: LayoutElement["id"],
    fieldName: keyof LayoutElement["fields"],
    before: number,
    after: number,
  ) {
    const command = createLayoutCommand("Edit Field", [
      {
        elementId: id,
        field: fieldName,
        before,
        after,
      },
    ]);

    if (command) {
      setUndoStack((current) => pushHistory(current, command));
      setRedoStack([]);
    }
  }

  function commitCommand(command: LayoutCommand) {
    setElements((current) => applyLayoutCommand(current, command, "after"));
    setUndoStack((current) => pushHistory(current, command));
    setRedoStack([]);
  }

  function undoLayoutChange() {
    setUndoStack((currentUndoStack) => {
      const command = currentUndoStack[currentUndoStack.length - 1];
      if (!command) {
        return currentUndoStack;
      }

      setElements((current) => applyLayoutCommand(current, command, "before"));
      setRedoStack((currentRedoStack) => [...currentRedoStack, command]);
      return currentUndoStack.slice(0, -1);
    });
  }

  function redoLayoutChange() {
    setRedoStack((currentRedoStack) => {
      const command = currentRedoStack[currentRedoStack.length - 1];
      if (!command) {
        return currentRedoStack;
      }

      setElements((current) => applyLayoutCommand(current, command, "after"));
      setUndoStack((currentUndoStack) => pushHistory(currentUndoStack, command));
      return currentRedoStack.slice(0, -1);
    });
  }

  useEffect(() => {
    function handleHistoryShortcut(event: KeyboardEvent) {
      if (!event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        undoLayoutChange();
      }
      if (key === "y") {
        event.preventDefault();
        redoLayoutChange();
      }
    }

    window.addEventListener("keydown", handleHistoryShortcut);
    return () => window.removeEventListener("keydown", handleHistoryShortcut);
  }, []);

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
        fileMenuOpen={fileMenuOpen}
        gameState={gameState}
        presetMenuOpen={presetMenuOpen}
        onApplySafeAreaPreset={applySafeAreaPreset}
        onBackupSavedFile={backupSavedFile}
        onBrowseGameFolder={browseGameFolder}
        onRestoreFile={restoreFile}
        onResetDefaults={resetToDefaults}
        onSaveLayout={saveLayout}
        onToggleFileMenu={() => {
          setFileMenuOpen((open) => !open);
          setPresetMenuOpen(false);
        }}
        onTogglePresetMenu={() => {
          setPresetMenuOpen((open) => !open);
          setFileMenuOpen(false);
        }}
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
          canRedo={redoStack.length > 0}
          canUndo={undoStack.length > 0}
          elements={elements}
          selectedId={selectedId}
          selectedMonitor={selectedMonitor}
          showSafeArea={showSafeArea}
          onCommitElementMove={commitElementMove}
          onMoveElement={updateElementPosition}
          onRedo={redoLayoutChange}
          onSelect={setSelectedId}
          onShowSafeAreaChange={setShowSafeArea}
          onUndo={undoLayoutChange}
        />

        <PropertyPanel
          collapsedSections={collapsedSections}
          selected={selected}
          selectedMonitor={selectedMonitor}
          onCommitElementField={commitElementField}
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
