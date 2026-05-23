import { useRef, useState } from "react";
import { LayoutCanvas } from "../canvas/LayoutCanvas";
import { ElementTreeSection } from "../element-tree/ElementTree";
import type { ElementId, LayoutElement, MonitorInfo } from "../model/types";
import { MonitorSection } from "../monitor/MonitorSection";
import { PropertyPanel } from "../properties/PropertyPanel";

const LEFT_PANEL_DEFAULT = 260;
const RIGHT_PANEL_DEFAULT = 300;
const LEFT_PANEL_MIN = 200;
const LEFT_PANEL_MAX = 480;
const RIGHT_PANEL_MIN = 240;
const RIGHT_PANEL_MAX = 560;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

type LayoutWorkspaceProps = {
  canRedo: boolean;
  canUndo: boolean;
  collapsedSections: Record<string, boolean>;
  elements: LayoutElement[];
  monitors: MonitorInfo[];
  normalizedInset: number;
  selected: LayoutElement;
  selectedId: ElementId;
  selectedMonitor: MonitorInfo;
  selectedMonitorId: string;
  showSafeArea: boolean;
  onCommitElementField: (id: ElementId, fieldName: keyof LayoutElement["fields"], before: number, after: number) => void;
  onCommitElementMove: (id: ElementId, before: { x: number; y: number }, after: { x: number; y: number }) => void;
  onMonitorChange: (id: string) => void;
  onMoveElement: (id: ElementId, x: number, y: number) => void;
  onRedo: () => void;
  onSelect: (id: ElementId) => void;
  onShowSafeAreaChange: (show: boolean) => void;
  onToggleElementVisibility: (id: ElementId) => void;
  onToggleSection: (id: string) => void;
  onUndo: () => void;
  onUpdateElementField: (id: ElementId, fieldName: keyof LayoutElement["fields"], value: number) => void;
};

export function LayoutWorkspace({
  canRedo,
  canUndo,
  collapsedSections,
  elements,
  monitors,
  normalizedInset,
  selected,
  selectedId,
  selectedMonitor,
  selectedMonitorId,
  showSafeArea,
  onCommitElementField,
  onCommitElementMove,
  onMonitorChange,
  onMoveElement,
  onRedo,
  onSelect,
  onShowSafeAreaChange,
  onToggleElementVisibility,
  onToggleSection,
  onUndo,
  onUpdateElementField,
}: LayoutWorkspaceProps) {
  const [leftPanelWidth, setLeftPanelWidth] = useState(LEFT_PANEL_DEFAULT);
  const [rightPanelWidth, setRightPanelWidth] = useState(RIGHT_PANEL_DEFAULT);
  const dragRef = useRef<{
    side: "left" | "right";
    startX: number;
    startWidth: number;
  } | null>(null);

  function startResize(side: "left" | "right", clientX: number) {
    dragRef.current = {
      side,
      startX: clientX,
      startWidth: side === "left" ? leftPanelWidth : rightPanelWidth,
    };
    document.body.classList.add("panel-resizing");

    function handlePointerMove(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }

      const deltaX = event.clientX - drag.startX;
      if (drag.side === "left") {
        setLeftPanelWidth(clamp(drag.startWidth + deltaX, LEFT_PANEL_MIN, LEFT_PANEL_MAX));
      } else {
        setRightPanelWidth(clamp(drag.startWidth - deltaX, RIGHT_PANEL_MIN, RIGHT_PANEL_MAX));
      }
    }

    function handlePointerUp() {
      dragRef.current = null;
      document.body.classList.remove("panel-resizing");
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  return (
    <section
      className="workspace"
      style={{
        gridTemplateColumns: `${leftPanelWidth}px 6px minmax(0, 1fr) 6px ${rightPanelWidth}px`,
      }}
    >
      <aside className="left-panel">
        <MonitorSection
          collapsedSections={collapsedSections}
          monitors={monitors}
          normalizedInset={normalizedInset}
          selectedMonitor={selectedMonitor}
          selectedMonitorId={selectedMonitorId}
          onMonitorChange={onMonitorChange}
          onToggleSection={onToggleSection}
        />
        <ElementTreeSection
          collapsedSections={collapsedSections}
          elements={elements}
          selectedId={selectedId}
          onSelect={onSelect}
          onToggleElementVisibility={onToggleElementVisibility}
          onToggleSection={onToggleSection}
        />
      </aside>

      <div
        aria-label="Resize left panel"
        className="panel-resize-handle"
        onPointerDown={(event) => {
          event.preventDefault();
          startResize("left", event.clientX);
        }}
        role="separator"
      />

      <LayoutCanvas
        canRedo={canRedo}
        canUndo={canUndo}
        elements={elements}
        selectedId={selectedId}
        selectedMonitor={selectedMonitor}
        showSafeArea={showSafeArea}
        onCommitElementMove={onCommitElementMove}
        onMoveElement={onMoveElement}
        onRedo={onRedo}
        onSelect={onSelect}
        onShowSafeAreaChange={onShowSafeAreaChange}
        onUndo={onUndo}
      />

      <div
        aria-label="Resize right panel"
        className="panel-resize-handle"
        onPointerDown={(event) => {
          event.preventDefault();
          startResize("right", event.clientX);
        }}
        role="separator"
      />

      <PropertyPanel
        collapsedSections={collapsedSections}
        selected={selected}
        selectedMonitor={selectedMonitor}
        onCommitElementField={onCommitElementField}
        onToggleSection={onToggleSection}
        onUpdateElementField={onUpdateElementField}
      />
    </section>
  );
}
