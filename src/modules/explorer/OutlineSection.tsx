import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { SectionHeader } from "./SectionHeader";
import { type MarkdownHeading } from "@/modules/editor";

type Props = {
  collapsed: boolean;
  onToggle: () => void;
  headings: MarkdownHeading[] | null;
  activeLine: number | null;
  onJump: (line: number) => void;
};

export function OutlineSection({
  collapsed,
  onToggle,
  headings,
  activeLine,
  onJump,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col">
      <SectionHeader
        title={t("explorer.outline")}
        collapsed={collapsed}
        onToggle={onToggle}
      />
      {!collapsed && headings !== null && headings.length === 0 && (
        <div className="flex flex-1 items-center justify-center px-3 py-2 text-center text-[11px] text-muted-foreground">
          {t("explorer.outlineEmpty")}
        </div>
      )}
      {!collapsed && headings !== null && headings.length > 0 && (
        <div className="flex-1 overflow-y-auto px-1 py-1">
          {headings.map((h) => (
            <button
              key={h.line}
              type="button"
              onClick={() => onJump(h.line)}
              className={cn(
                "w-full truncate rounded px-2 py-0.5 text-left text-[12px] transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                h.line === activeLine
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-foreground/80",
              )}
              style={{ paddingLeft: `${(h.level - 1) * 12 + 8}px` }}
            >
              {h.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
