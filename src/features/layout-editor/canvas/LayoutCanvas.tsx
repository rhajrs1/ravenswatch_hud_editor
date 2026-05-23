import type { RefObject } from "react";
import { Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import { getElement, isEffectivelyVisible } from "../element-tree/elementTreeModel";
import type { ElementId, LayoutElement, MonitorInfo } from "../model/types";
import { normalizedFromRootAnchorX, worldRect } from "./canvasModel";

function shortLabel(name: string) {
  return name
    .replace(/^HUD_Frame_/, "HUD ")
    .replace(/_Frame$/, "")
    .replace(/_Elements$/, "")
    .replace(/_/g, " ");
}

type LayoutCanvasProps = {
  canvasPanelRef: RefObject<HTMLElement | null>;
  elements: LayoutElement[];
  safeArea: { x: number; y: number; width: number; height: number };
  scale: number;
  selectedId: ElementId;
  selectedMonitor: MonitorInfo;
  showSafeArea: boolean;
  stageHeight: number;
  stageWidth: number;
  onMoveElement: (id: ElementId, x: number, y: number) => void;
  onSelect: (id: ElementId) => void;
  onShowSafeAreaChange: (show: boolean) => void;
};

export function LayoutCanvas({ canvasPanelRef, elements, safeArea, scale, selectedId, selectedMonitor, showSafeArea, stageHeight, stageWidth, onMoveElement, onSelect, onShowSafeAreaChange }: LayoutCanvasProps) {
  function handleDragMove(id: ElementId, stageX: number, stageY: number) {
    const element = getElement(elements, id);
    const parent = element?.parentId ? getElement(elements, element.parentId) : null;
    const parentRect = parent ? worldRect(parent, elements, selectedMonitor.width, selectedMonitor.height) : null;
    const worldX = stageX / scale;
    const worldY = stageY / scale;
    const nextX = parentRect
      ? (worldX - parentRect.x) / parentRect.width
      : normalizedFromRootAnchorX(worldX, selectedMonitor.width);
    const nextY = parentRect ? (worldY - parentRect.y) / parentRect.height : worldY / selectedMonitor.height;

    onMoveElement(id, nextX, nextY);
  }

  return (
    <section className="canvas-panel" ref={canvasPanelRef}>
      <div className="layout-header">
        <span>Layout</span>
        <label className="toggle-field">
          <input checked={showSafeArea} onChange={(event) => onShowSafeAreaChange(event.currentTarget.checked)} type="checkbox" />
          <span>16:9 Safe Area</span>
        </label>
      </div>
      <div className="stage-shell">
        <Stage width={stageWidth} height={stageHeight}>
          <Layer>
            <Rect width={stageWidth} height={stageHeight} fill="#111827" />
            <Rect x={0} y={0} width={stageWidth} height={stageHeight} stroke="#e5e7eb" strokeWidth={1} opacity={0.72} />
            {showSafeArea && <Rect x={safeArea.x} y={safeArea.y} width={safeArea.width} height={safeArea.height} stroke="#93c5fd" strokeWidth={1} dash={[8, 5]} opacity={0.95} />}
            <Line points={[stageWidth / 2, 0, stageWidth / 2, stageHeight]} stroke="#64748b" dash={[6, 6]} />
            {elements.filter((element) => isEffectivelyVisible(element, elements)).map((element) => {
              const rect = worldRect(element, elements, selectedMonitor.width, selectedMonitor.height);
              const x = rect.anchorX * scale;
              const y = rect.anchorY * scale;
              const handleSize = element.parentId === null ? 26 : 20;
              return (
                <Group key={element.id} draggable x={x} y={y} onClick={() => onSelect(element.id)} onTap={() => onSelect(element.id)} onDragMove={(event) => handleDragMove(element.id, event.target.x(), event.target.y())}>
                  <Rect x={(rect.x - x / scale) * scale} y={(rect.y - y / scale) * scale} width={rect.width * scale} height={rect.height * scale} stroke={element.color} strokeWidth={1} opacity={element.id === selectedId ? 0.78 : 0.28} />
                  <Rect x={-handleSize / 2} y={-handleSize / 2} width={handleSize} height={handleSize} fill={element.color} opacity={element.id === selectedId ? 0.55 : 0.32} stroke={element.color} strokeWidth={element.id === selectedId ? 3 : 2} cornerRadius={4} />
                  <Line points={[-34, 0, 34, 0]} stroke={element.color} strokeWidth={1} opacity={0.75} />
                  <Line points={[0, -34, 0, 34]} stroke={element.color} strokeWidth={1} opacity={0.75} />
                  <Text x={16} y={-26} fill="#f8fafc" fontSize={14} text={shortLabel(element.name)} />
                </Group>
              );
            })}
          </Layer>
        </Stage>
      </div>
    </section>
  );
}
