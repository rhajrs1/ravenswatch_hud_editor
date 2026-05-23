import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import type { ReactNode } from "react";

type PropertySectionProps = {
  id: string;
  title: string;
  collapsedSections: Record<string, boolean>;
  onToggle: (id: string) => void;
  children: ReactNode;
};

export function PropertySection({ id, title, collapsedSections, onToggle, children }: PropertySectionProps) {
  const collapsed = Boolean(collapsedSections[id]);

  return (
    <div className="property-section">
      <button className="section-header" onClick={() => onToggle(id)} type="button">
        <span>{title}</span>
        {collapsed ? (
          <IconChevronRight className="section-arrow" size={16} stroke={2} />
        ) : (
          <IconChevronDown className="section-arrow" size={16} stroke={2} />
        )}
      </button>
      {!collapsed ? children : null}
    </div>
  );
}
