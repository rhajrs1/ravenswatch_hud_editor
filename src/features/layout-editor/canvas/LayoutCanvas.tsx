import { useEffect, useMemo, useRef, useState } from "react";
import { IconArrowBackUp, IconArrowForwardUp } from "@tabler/icons-react";
import { Circle, Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import { getElement, isEffectivelyVisible } from "../element-tree/elementTreeModel";
import type { ElementId, LayoutElement, MonitorInfo } from "../model/types";
import { normalizedFromRootAnchorX, worldRect } from "./canvasModel";

const TARGET_ASPECT = 16 / 9;
const VIEW_PADDING = 28;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 10;
const ELEMENT_HIT_STROKE_WIDTH = 18;

function shortLabel(name: string) {
  return name
    .replace(/^HUD_Frame_/, "HUD ")
    .replace(/_Frame$/, "")
    .replace(/_Elements$/, "")
    .replace(/_/g, " ");
}

type LayoutCanvasProps = {
  canRedo: boolean;
  canUndo: boolean;
  elements: LayoutElement[];
  selectedId: ElementId;
  selectedMonitor: MonitorInfo;
  showSafeArea: boolean;
  onMoveElement: (id: ElementId, x: number, y: number) => void;
  onCommitElementMove: (id: ElementId, before: Point, after: Point) => void;
  onRedo: () => void;
  onSelect: (id: ElementId) => void;
  onShowSafeAreaChange: (show: boolean) => void;
  onUndo: () => void;
};

type Point = {
  x: number;
  y: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function fitScaleForViewport(width: number, height: number, monitor: MonitorInfo) {
  const availableWidth = Math.max(1, width - VIEW_PADDING * 2);
  const availableHeight = Math.max(1, height - VIEW_PADDING * 2);
  return Math.min(availableWidth / monitor.width, availableHeight / monitor.height);
}

function centeredPan(width: number, height: number, monitor: MonitorInfo, scale: number): Point {
  return {
    x: (width - monitor.width * scale) / 2,
    y: (height - monitor.height * scale) / 2,
  };
}

export function LayoutCanvas({ canRedo, canUndo, elements, selectedId, selectedMonitor, showSafeArea, onMoveElement, onCommitElementMove, onRedo, onSelect, onShowSafeAreaChange, onUndo }: LayoutCanvasProps) {
  const stageShellRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const lastPanPointerRef = useRef<Point | null>(null);
  const spacePressedRef = useRef(false);
  const elementDragRef = useRef<{ id: ElementId; offset: Point; start: Point; latest: Point } | null>(null);
  const hasMeasuredViewportRef = useRef(false);
  const selectedMonitorRef = useRef(selectedMonitor);
  const [viewportSize, setViewportSize] = useState({ width: 640, height: 360 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>(() => centeredPan(640, 360, selectedMonitor, fitScaleForViewport(640, 360, selectedMonitor)));
  const [spacePressed, setSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const monitorKey = `${selectedMonitor.id}:${selectedMonitor.width}x${selectedMonitor.height}`;

  const fitScale = useMemo(
    () => fitScaleForViewport(viewportSize.width, viewportSize.height, selectedMonitor),
    [selectedMonitor, viewportSize.height, viewportSize.width],
  );
  const displayScale = fitScale * zoom;
  const safeWidth = Math.min(selectedMonitor.height * TARGET_ASPECT, selectedMonitor.width);
  const safeLeft = Math.max(0, (selectedMonitor.width - safeWidth) / 2);

  useEffect(() => {
    selectedMonitorRef.current = selectedMonitor;
  }, [selectedMonitor]);

  useEffect(() => {
    const node = stageShellRef.current;
    if (!node) {
      return;
    }

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      const nextSize = {
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height)),
      };

      setViewportSize((currentSize) => {
        if (currentSize.width === nextSize.width && currentSize.height === nextSize.height) {
          return currentSize;
        }

        if (!hasMeasuredViewportRef.current) {
          const monitor = selectedMonitorRef.current;
          const nextFitScale = fitScaleForViewport(nextSize.width, nextSize.height, monitor);
          setPan(centeredPan(nextSize.width, nextSize.height, monitor, nextFitScale));
          hasMeasuredViewportRef.current = true;
          return nextSize;
        }

        setPan((currentPan) => ({
          x: currentPan.x + (nextSize.width - currentSize.width) / 2,
          y: currentPan.y + (nextSize.height - currentSize.height) / 2,
        }));
        return nextSize;
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const nextFitScale = fitScaleForViewport(viewportSize.width, viewportSize.height, selectedMonitor);
    isPanningRef.current = false;
    lastPanPointerRef.current = null;
    elementDragRef.current = null;
    setIsPanning(false);
    setZoom(1);
    setPan(centeredPan(viewportSize.width, viewportSize.height, selectedMonitor, nextFitScale));
  }, [monitorKey]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.code === "Space") {
        spacePressedRef.current = true;
        setSpacePressed(true);
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") {
        spacePressedRef.current = false;
        setSpacePressed(false);
        isPanningRef.current = false;
        setIsPanning(false);
        lastPanPointerRef.current = null;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  function resetView() {
    setZoom(1);
    setPan(centeredPan(viewportSize.width, viewportSize.height, selectedMonitor, fitScale));
  }

  function handleDragMove(id: ElementId, worldX: number, worldY: number) {
    const element = getElement(elements, id);
    const parent = element?.parentId ? getElement(elements, element.parentId) : null;
    const parentRect = parent ? worldRect(parent, elements, selectedMonitor.width, selectedMonitor.height) : null;
    const nextX = parentRect
      ? (worldX - parentRect.x) / parentRect.width
      : normalizedFromRootAnchorX(worldX, selectedMonitor.width);
    const nextY = parentRect ? (worldY - parentRect.y) / parentRect.height : worldY / selectedMonitor.height;

    onMoveElement(id, nextX, nextY);
    if (elementDragRef.current?.id === id) {
      elementDragRef.current.latest = { x: nextX, y: nextY };
    }
  }

  function stagePointerToWorld(pointer: Point): Point {
    return {
      x: (pointer.x - pan.x) / displayScale,
      y: (pointer.y - pan.y) / displayScale,
    };
  }

  function handleElementMouseDown(id: ElementId, event: any) {
    if (event.evt.button !== 0) {
      return;
    }

    const stage = event.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (!pointer) {
      return;
    }

    const element = getElement(elements, id)!;
    const rect = worldRect(element, elements, selectedMonitor.width, selectedMonitor.height);
    const worldPointer = stagePointerToWorld(pointer);
    elementDragRef.current = {
      id,
      offset: {
        x: worldPointer.x - rect.anchorX,
        y: worldPointer.y - rect.anchorY,
      },
      start: {
        x: element.fields.x.currentValue,
        y: element.fields.y.currentValue,
      },
      latest: {
        x: element.fields.x.currentValue,
        y: element.fields.y.currentValue,
      },
    };
    event.cancelBubble = true;
    onSelect(id);
  }

  function handleWheel(event: any) {
    event.evt.preventDefault();
    const stage = event.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (!pointer) {
      return;
    }

    const oldScale = displayScale;
    const worldPointer = {
      x: (pointer.x - pan.x) / oldScale,
      y: (pointer.y - pan.y) / oldScale,
    };
    const direction = event.evt.deltaY > 0 ? -1 : 1;
    const nextZoom = clamp(zoom * (direction > 0 ? 1.1 : 1 / 1.1), MIN_ZOOM, MAX_ZOOM);
    const nextScale = fitScale * nextZoom;

    setZoom(nextZoom);
    setPan({
      x: pointer.x - worldPointer.x * nextScale,
      y: pointer.y - worldPointer.y * nextScale,
    });
  }

  function handleMouseDown(event: any) {
    const stage = event.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (!pointer) {
      return;
    }

    const isMiddleButton = event.evt.button === 1;
    const isPanSurface =
      event.target === stage || event.target.name() === "canvas-background" || event.target.name() === "monitor-background";
    const isSpacePan = spacePressedRef.current && isPanSurface;
    if (!isMiddleButton && !isSpacePan) {
      return;
    }

    event.evt.preventDefault();
    isPanningRef.current = true;
    setIsPanning(true);
    lastPanPointerRef.current = pointer;
  }

  function handleMouseMove(event: any) {
    const activeElementDrag = elementDragRef.current;
    if (activeElementDrag) {
      const stage = event.target.getStage();
      const pointer = stage?.getPointerPosition();
      if (!pointer) {
        return;
      }

      const worldPointer = stagePointerToWorld(pointer);
      handleDragMove(
        activeElementDrag.id,
        worldPointer.x - activeElementDrag.offset.x,
        worldPointer.y - activeElementDrag.offset.y,
      );
      return;
    }

    if (!isPanningRef.current) {
      return;
    }

    const stage = event.target.getStage();
    const pointer = stage?.getPointerPosition();
    const lastPointer = lastPanPointerRef.current;
    if (!pointer || !lastPointer) {
      return;
    }

    setPan((current) => ({
      x: current.x + pointer.x - lastPointer.x,
      y: current.y + pointer.y - lastPointer.y,
    }));
    lastPanPointerRef.current = pointer;
  }

  function stopPanning() {
    const activeElementDrag = elementDragRef.current;
    if (activeElementDrag) {
      onCommitElementMove(activeElementDrag.id, activeElementDrag.start, activeElementDrag.latest);
    }
    isPanningRef.current = false;
    setIsPanning(false);
    lastPanPointerRef.current = null;
    elementDragRef.current = null;
  }

  return (
    <section className="canvas-panel">
      <div className="layout-header">
        <span>Layout</span>
        <div className="layout-history-actions">
          <button aria-label="Undo" className="icon-action" disabled={!canUndo} onClick={onUndo} title="Undo (Ctrl+Z)" type="button">
            <IconArrowBackUp size={17} stroke={2} />
          </button>
          <button aria-label="Redo" className="icon-action" disabled={!canRedo} onClick={onRedo} title="Redo (Ctrl+Y)" type="button">
            <IconArrowForwardUp size={17} stroke={2} />
          </button>
        </div>
        <div className="layout-actions">
          <span className="zoom-readout">{Math.round(zoom * 100)}%</span>
          <button className="layout-tool-button" onClick={resetView} type="button">
            Fit
          </button>
          <label className="toggle-field">
            <input checked={showSafeArea} onChange={(event) => onShowSafeAreaChange(event.currentTarget.checked)} type="checkbox" />
            <span>16:9 Safe Area</span>
          </label>
        </div>
      </div>
      <div className={["stage-shell", spacePressed ? "pan-ready" : "", isPanning ? "panning" : ""].join(" ")} ref={stageShellRef}>
        <Stage
          width={viewportSize.width}
          height={viewportSize.height}
          onMouseDown={handleMouseDown}
          onMouseLeave={stopPanning}
          onMouseMove={handleMouseMove}
          onMouseUp={stopPanning}
          onWheel={handleWheel}
        >
          <Layer>
            <Rect name="canvas-background" width={viewportSize.width} height={viewportSize.height} fill="#0b1120" />
            <Group x={pan.x} y={pan.y} scaleX={displayScale} scaleY={displayScale}>
              <Rect name="monitor-background" x={0} y={0} width={selectedMonitor.width} height={selectedMonitor.height} fill="#111827" />
              <Rect x={0} y={0} width={selectedMonitor.width} height={selectedMonitor.height} stroke="#e5e7eb" strokeWidth={1 / displayScale} opacity={0.72} />
              {showSafeArea && <Rect x={safeLeft} y={0} width={safeWidth} height={selectedMonitor.height} stroke="#93c5fd" strokeWidth={1 / displayScale} dash={[8 / displayScale, 5 / displayScale]} opacity={0.95} />}
              <Line points={[selectedMonitor.width / 2, 0, selectedMonitor.width / 2, selectedMonitor.height]} stroke="#64748b" strokeWidth={1 / displayScale} dash={[6 / displayScale, 6 / displayScale]} />
              {elements.filter((element) => isEffectivelyVisible(element, elements)).map((element) => {
                const rect = worldRect(element, elements, selectedMonitor.width, selectedMonitor.height);
                const localX = rect.x - rect.anchorX;
                const localY = rect.y - rect.anchorY;
                return (
                  <Group key={element.id} x={rect.anchorX} y={rect.anchorY}>
                    <Rect
                      x={localX}
                      y={localY}
                      width={rect.width}
                      height={rect.height}
                      stroke={element.color}
                      strokeWidth={1 / displayScale}
                      opacity={element.id === selectedId ? 0.78 : 0.28}
                      listening={false}
                    />
                    <Rect
                      x={localX}
                      y={localY}
                      width={rect.width}
                      height={rect.height}
                      stroke="rgba(255,255,255,0.01)"
                      strokeWidth={ELEMENT_HIT_STROKE_WIDTH / displayScale}
                      fillEnabled={false}
                      onMouseDown={(event) => handleElementMouseDown(element.id, event)}
                      onTap={() => onSelect(element.id)}
                    />
                    <Circle
                      radius={(element.id === selectedId ? 5 : 4) / displayScale}
                      fill="#ef4444"
                      onMouseDown={(event) => handleElementMouseDown(element.id, event)}
                      onTap={() => onSelect(element.id)}
                    />
                    <Text x={16 / displayScale} y={-26 / displayScale} fill="#f8fafc" fontSize={14 / displayScale} text={shortLabel(element.name)} listening={false} />
                  </Group>
                );
              })}
            </Group>
          </Layer>
        </Stage>
      </div>
    </section>
  );
}
