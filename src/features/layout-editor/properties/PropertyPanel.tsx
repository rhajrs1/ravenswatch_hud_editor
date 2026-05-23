import { Fragment } from "react";
import type { LayoutElement, MonitorInfo } from "../model/types";
import { PropertySection } from "../shared/PropertySection";

function formatFloat(value: number) {
  return value.toFixed(7).replace(/0+$/, "").replace(/\.$/, ".0");
}

type PropertyPanelProps = {
  collapsedSections: Record<string, boolean>;
  selected: LayoutElement;
  selectedMonitor: MonitorInfo;
  onToggleSection: (id: string) => void;
  onUpdateElementField: (id: LayoutElement["id"], fieldName: keyof LayoutElement["fields"], value: number) => void;
};

const FIELD_LABELS: Record<keyof LayoutElement["fields"], string> = {
  x: "X",
  y: "Y",
  width: "Width",
  height: "Height",
  pivotX: "Pivot X",
  pivotY: "Pivot Y",
};

export function PropertyPanel({ collapsedSections, selected, selectedMonitor, onToggleSection, onUpdateElementField }: PropertyPanelProps) {
  return (
    <aside className="panel">
      <PropertySection collapsedSections={collapsedSections} id="selection" onToggle={onToggleSection} title="Selection">
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
            {(["x", "y", "width", "height", "pivotX", "pivotY"] as const).map((fieldName) => (
              <Fragment key={fieldName}>
                <dt>{FIELD_LABELS[fieldName]}</dt>
                <dd>
                  <input
                    className="number-input"
                    min={fieldName === "width" || fieldName === "height" ? "0" : undefined}
                    onChange={(event) => onUpdateElementField(selected.id, fieldName, event.currentTarget.valueAsNumber)}
                    step="0.001"
                    type="number"
                    value={formatFloat(selected.fields[fieldName].currentValue)}
                  />
                </dd>
              </Fragment>
            ))}
            <dt>Delta px</dt>
            <dd>{Math.round((selected.fields.x.currentValue - selected.fields.x.defaultValue) * selectedMonitor.height)}</dd>
          </dl>
        </div>
      </PropertySection>
    </aside>
  );
}
