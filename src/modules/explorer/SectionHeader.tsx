import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export type SectionHeaderProps = {
  icon?: ReactNode;
  title: string;
  titleAttr?: string;
  collapsed: boolean;
  onToggle: () => void;
  actions?: ReactNode;
};

export function SectionHeader({
  icon,
  title,
  titleAttr,
  collapsed,
  onToggle,
  actions,
}: SectionHeaderProps) {
  return (
    <div className="flex h-8 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex flex-1 items-center gap-1 truncate text-xs font-medium text-foreground/80 hover:text-foreground"
        title={titleAttr}
      >
        <HugeiconsIcon
          icon={ChevronRightIcon}
          size={12}
          strokeWidth={2}
          className={cn(
            "shrink-0 transition-transform duration-150",
            !collapsed && "rotate-90",
          )}
        />
        {icon}
        <span className="truncate">{title}</span>
      </button>
      {actions && <div className="flex items-center gap-0.5">{actions}</div>}
    </div>
  );
}
