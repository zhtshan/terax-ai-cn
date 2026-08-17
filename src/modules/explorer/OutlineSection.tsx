import { useTranslation } from "react-i18next";
import { SectionHeader } from "./SectionHeader";

type Props = {
  collapsed: boolean;
  onToggle: () => void;
};

export function OutlineSection({ collapsed, onToggle }: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col">
      <SectionHeader
        title={t("explorer.outline")}
        collapsed={collapsed}
        onToggle={onToggle}
      />
      {!collapsed && (
        <div className="flex flex-1 items-center justify-center px-3 py-2 text-center text-[11px] text-muted-foreground">
          {t("explorer.outlinePlaceholder")}
        </div>
      )}
    </div>
  );
}
