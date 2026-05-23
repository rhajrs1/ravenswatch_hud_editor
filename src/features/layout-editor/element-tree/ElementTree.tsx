import { IconChevronDown, IconChevronRight, IconEye, IconEyeOff } from "@tabler/icons-react";
import type { ReactNode } from "react";
import type { ElementId, LayoutElement } from "../model/types";
import { PropertySection } from "../shared/PropertySection";
import { getChildren, isAncestorHidden, isEffectivelyVisible } from "./elementTreeModel";

type ElementTreeSectionProps = {
  collapsedSections: Record<string, boolean>;
  elements: LayoutElement[];
  selectedId: ElementId;
  onSelect: (id: ElementId) => void;
  onToggleElementVisibility: (id: ElementId) => void;
  onToggleSection: (id: string) => void;
};

export function ElementTreeSection({ collapsedSections, elements, selectedId, onSelect, onToggleElementVisibility, onToggleSection }: ElementTreeSectionProps) {
  function renderElementTree(parentId: ElementId | null = null, depth = 0): ReactNode {
    return getChildren(elements, parentId).map((element) => {
      const children = getChildren(elements, element.id);
      const collapsed = Boolean(collapsedSections["tree:" + element.id]);
      const effectiveVisible = isEffectivelyVisible(element, elements);
      const mutedByParent = element.visible && isAncestorHidden(element, elements);

      return (
        <div className="tree-node" key={element.id}>
          <div
            className={["tree-row", element.id === selectedId ? "active" : "", effectiveVisible ? "" : "hidden", mutedByParent ? "muted" : ""].join(" ")}
            style={{ paddingLeft: 6 + depth * 16 }}
          >
            <button className="tree-expander" disabled={children.length === 0} onClick={() => onToggleSection("tree:" + element.id)} type="button">
              {children.length > 0 ? collapsed ? <IconChevronRight size={14} stroke={2} /> : <IconChevronDown size={14} stroke={2} /> : null}
            </button>
            <button className="tree-eye" onClick={() => onToggleElementVisibility(element.id)} type="button">
              {element.visible ? <IconEye size={15} stroke={2} /> : <IconEyeOff size={15} stroke={2} />}
            </button>
            <button className="tree-label" onClick={() => onSelect(element.id)} type="button">
              <span className="swatch" style={{ background: element.color }} />
              <span>{element.name}</span>
            </button>
          </div>
          {!collapsed && children.length > 0 ? renderElementTree(element.id, depth + 1) : null}
        </div>
      );
    });
  }

  return (
    <PropertySection collapsedSections={collapsedSections} id="elements" onToggle={onToggleSection} title="Elements">
      <div className="section-content">
        <div className="element-tree">{renderElementTree()}</div>
      </div>
    </PropertySection>
  );
}
