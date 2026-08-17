import { useTranslation } from "react-i18next";

export function OutlineSection() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full items-center justify-center px-3 py-2 text-center text-[11px] text-muted-foreground">
      {t("explorer.outlinePlaceholder")}
    </div>
  );
}
