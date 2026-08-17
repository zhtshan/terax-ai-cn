import { useTranslation } from "react-i18next";
import { SectionHeader } from "./SectionHeader";

type Props = {
  collapsed: boolean;
  onToggle: () => void;
};

export function TimelineSection({ collapsed, onToggle }: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col">
      <SectionHeader
        title={t("explorer.timeline")}
        collapsed={collapsed}
        onToggle={onToggle}
      />
      {!collapsed && (
        <div className="flex flex-1 items-center justify-center px-3 py-2 text-center text-[11px] text-muted-foreground">
          {t("explorer.timelinePlaceholder")}
        </div>
      )}
    </div>
  );
}
