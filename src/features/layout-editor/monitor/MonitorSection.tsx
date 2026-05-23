import type { MonitorInfo } from "../model/types";
import { PropertySection } from "../shared/PropertySection";

function formatFloat(value: number) {
  return value.toFixed(7).replace(/0+$/, "").replace(/\.$/, ".0");
}

type MonitorSectionProps = {
  collapsedSections: Record<string, boolean>;
  monitors: MonitorInfo[];
  normalizedInset: number;
  selectedMonitor: MonitorInfo;
  selectedMonitorId: string;
  onMonitorChange: (id: string) => void;
  onToggleSection: (id: string) => void;
};

export function MonitorSection({ collapsedSections, monitors, normalizedInset, selectedMonitor, selectedMonitorId, onMonitorChange, onToggleSection }: MonitorSectionProps) {
  return (
    <PropertySection collapsedSections={collapsedSections} id="monitor" onToggle={onToggleSection} title="Monitor">
      <div className="section-content">
        <label className="field">
          <span>Display</span>
          <select value={selectedMonitorId} onChange={(event) => onMonitorChange(event.currentTarget.value)}>
            {monitors.map((monitor, index) => (
              <option key={monitor.id} value={monitor.id}>
                {monitor.name || "Display " + (index + 1)} - {monitor.width}x{monitor.height}
                {monitor.isPrimary ? " - Primary" : ""}
              </option>
            ))}
          </select>
        </label>
        <dl className="props">
          <dt>Resolution</dt>
          <dd>{selectedMonitor.width}x{selectedMonitor.height}</dd>
          <dt>Position</dt>
          <dd>{selectedMonitor.x}, {selectedMonitor.y}</dd>
          <dt>Scale</dt>
          <dd>{formatFloat(selectedMonitor.scaleFactor)}</dd>
          <dt>16:9 Inset</dt>
          <dd>{formatFloat(normalizedInset)}</dd>
        </dl>
      </div>
    </PropertySection>
  );
}
