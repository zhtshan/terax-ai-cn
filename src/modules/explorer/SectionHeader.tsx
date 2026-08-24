import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";

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
    <div
      className={cn(
        "flex h-8 shrink-0 items-center gap-1 border-b px-2 transition-colors",
        collapsed ? "border-transparent" : "border-border/60",
        "hover:bg-accent/40",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        title={titleAttr}
        className={cn(
          "flex flex-1 select-none items-center gap-1 truncate text-xs font-medium transition-colors hover:text-foreground",
          collapsed ? "text-muted-foreground" : "text-foreground/80",
        )}
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
