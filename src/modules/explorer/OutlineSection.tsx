import { cn } from "@/lib/utils";
import type { OutlineItem, OutlineUnavailableReason } from "@/modules/editor";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";
import { iconForSymbolKind } from "./lib/symbolKindIcons";
import { SectionHeader } from "./SectionHeader";

type Props = {
  collapsed: boolean;
  onToggle: () => void;
  items: OutlineItem[] | null;
  unavailableReason?: OutlineUnavailableReason | null;
  activeLine: number | null;
  onJump: (line: number) => void;
};

export function OutlineSection({
  collapsed,
  onToggle,
  items,
  unavailableReason,
  activeLine,
  onJump,
}: Props) {
  const { t } = useTranslation();

  const emptyText =
    items !== null
      ? t("explorer.outlineEmpty")
      : unavailableReason === "request-failed"
        ? t("explorer.outlineRequestFailed")
        : unavailableReason === "unsupported-language"
          ? t("explorer.outlineUnsupported")
          : null;

  return (
    <div className="flex h-full flex-col">
      <SectionHeader
        title={t("explorer.outline")}
        collapsed={collapsed}
        onToggle={onToggle}
      />
      {!collapsed && (items === null || items.length === 0) && emptyText && (
        <div className="flex flex-1 items-center justify-center px-3 py-2 text-center text-[11px] text-muted-foreground">
          {emptyText}
        </div>
      )}
      {!collapsed && items !== null && items.length > 0 && (
        <div className="flex-1 overflow-y-auto px-1 py-1">
          {items.map((item, index) => {
            const icon = iconForSymbolKind(item.kind);
            return (
              <button
                // Multiple symbols can share a line (e.g. nested symbols
                // whose selectionRange starts on the same line), so line
                // number alone isn't a unique key.
                key={`${item.line}-${index}`}
                type="button"
                onClick={() => onJump(item.line)}
                className={cn(
                  "flex w-full items-center gap-1.5 truncate rounded px-2 py-0.5 text-left text-[12px] transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  item.line === activeLine
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-foreground/80",
                )}
                style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}
              >
                {icon && (
                  <HugeiconsIcon
                    icon={icon}
                    size={12}
                    strokeWidth={2}
                    className="shrink-0 text-muted-foreground"
                  />
                )}
                <span className="truncate">{item.text}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
