import { Fragment, useRef } from "react";
import type { LayoutElement, MonitorInfo } from "../model/types";
import { PropertySection } from "../shared/PropertySection";

function formatFloat(value: number) {
  return value.toFixed(7).replace(/0+$/, "").replace(/\.$/, ".0");
}

function widthBasisLabel(selected: LayoutElement) {
  return selected.widthBasis.basis === "parentHeight" ? "Parent height" : "Parent width";
}

type PropertyPanelProps = {
  collapsedSections: Record<string, boolean>;
  selected: LayoutElement;
  selectedMonitor: MonitorInfo;
  onCommitElementField: (id: LayoutElement["id"], fieldName: keyof LayoutElement["fields"], before: number, after: number) => void;
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

export function PropertyPanel({ collapsedSections, selected, selectedMonitor, onCommitElementField, onToggleSection, onUpdateElementField }: PropertyPanelProps) {
  const editingStartRef = useRef<{
    id: LayoutElement["id"];
    fieldName: keyof LayoutElement["fields"];
    value: number;
  } | null>(null);

  function beginFieldEdit(fieldName: keyof LayoutElement["fields"]) {
    editingStartRef.current = {
      id: selected.id,
      fieldName,
      value: selected.fields[fieldName].currentValue,
    };
  }

  function commitFieldEdit(fieldName: keyof LayoutElement["fields"]) {
    const start = editingStartRef.current;
    if (!start || start.id !== selected.id || start.fieldName !== fieldName) {
      return;
    }

    const after = selected.fields[fieldName].currentValue;
    editingStartRef.current = null;
    onCommitElementField(selected.id, fieldName, start.value, after);
  }

  return (
    <aside className="panel">
      <PropertySection collapsedSections={collapsedSections} id="selection" onToggle={onToggleSection} title="Selection">
        <div className="section-content">
          {selected.availability === "unavailable" ? (
            <div className="inline-warning">
              This element is unavailable. {selected.unavailableReason}
            </div>
          ) : null}
          <dl className="props">
            <dt>Type</dt>
            <dd>{selected.kind}</dd>
            <dt>Name</dt>
            <dd>{selected.name}</dd>
            <dt>Marker</dt>
            <dd>{selected.marker}</dd>
            <dt>Width Basis</dt>
            <dd>{widthBasisLabel(selected)}</dd>
            <dt>Width Basis Offset</dt>
            <dd>{selected.widthBasis.offset}</dd>
            <dt>Width Basis Raw</dt>
            <dd>{selected.widthBasis.rawValue}</dd>
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
                    disabled={selected.availability === "unavailable" || !selected.fields[fieldName].writable}
                    min={fieldName === "width" || fieldName === "height" ? "0" : undefined}
                    onBlur={() => commitFieldEdit(fieldName)}
                    onChange={(event) => onUpdateElementField(selected.id, fieldName, event.currentTarget.valueAsNumber)}
                    onFocus={() => beginFieldEdit(fieldName)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      }
                    }}
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
