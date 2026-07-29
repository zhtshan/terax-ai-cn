import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { ReplaceState } from "./hooks/useReplaceRun";

export type ReplaceAffectedBarProps = {
  replacement: string;
  affectedFiles: number;
  totalMatches: number;
  replaceState: ReplaceState;
  onReplace: () => void;
};

function summarize(state: ReplaceState, t: (k: string) => string): {
  label: string;
  busy: boolean;
} {
  switch (state.kind) {
    case "idle":
      return { label: t("searchPanel.replaceAll"), busy: false };
    case "previewing":
      return { label: t("searchPanel.replaceAll"), busy: false };
    case "running":
      return { label: "Replacing…", busy: true };
    case "done":
      return {
        label: `${t("searchPanel.replaceAll")} — ${state.totalReplacements} done`,
        busy: false,
      };
    case "partial": {
      const failedCount = state.errors.length;
      return {
        label: `Partial — ${failedCount} failed`,
        busy: false,
      };
    }
    case "error":
      return { label: `Error: ${state.message}`, busy: false };
  }
}

export function ReplaceAffectedBar({
  replacement,
  affectedFiles,
  totalMatches,
  replaceState,
  onReplace,
}: ReplaceAffectedBarProps) {
  const { t } = useTranslation();

  // Hide when no replacement text or zero matches
  if (replacement.length === 0 || totalMatches === 0) {
    return null;
  }

  const { label, busy } = summarize(replaceState, t);
  const disabled = busy || replaceState.kind === "running";

  return (
    <div className="shrink-0 border-t border-border/60 bg-card/85 px-3 py-2 backdrop-blur">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>
          {t("searchPanel.replaceAffected", {
            files: affectedFiles,
            matches: totalMatches,
          })}
        </span>
        <Button
          type="button"
          size="sm"
          disabled={disabled}
          onClick={onReplace}
          className="ml-auto h-6 px-2 text-[11px]"
        >
          {label}
        </Button>
      </div>
    </div>
  );
}