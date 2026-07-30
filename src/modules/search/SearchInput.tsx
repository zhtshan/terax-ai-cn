import { useTranslation } from "react-i18next";
import {
  CaseSensitiveIcon,
  CodeIcon,
  QuotesIcon,
  ReplaceIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type SearchInputOptions = {
  pattern: string;
  replacement: string;
  regex: boolean;
  caseSensitive: boolean;
  whole_word: boolean;
  include: string;
  exclude: string;
};

export type SearchInputStats = {
  filesScanned: number;
  totalMatches: number;
  truncated: boolean;
};

export type SearchInputProps = {
  value: SearchInputOptions;
  onChange: (next: SearchInputOptions) => void;
  stats: SearchInputStats | null;
  rootPath: string | null;
};

function ToggleButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"];
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "ghost"}
      size="sm"
      aria-pressed={active}
      onClick={onClick}
      title={label}
      className={cn("h-7 px-2 text-[11px]")}
    >
      <HugeiconsIcon icon={icon} size={12} strokeWidth={1.75} />
      <span className="sr-only">{label}</span>
    </Button>
  );
}

export function SearchInput({ value, onChange, stats, rootPath }: SearchInputProps) {
  const { t } = useTranslation();

  if (!rootPath) {
    return (
      <div className="px-3 py-2 text-[11px] text-muted-foreground">
        {t("searchPanel.noWorkspace")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-2 py-1.5">
      <div className="relative">
        <HugeiconsIcon
          icon={Search01Icon}
          size={13}
          strokeWidth={2}
          className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={value.pattern}
          onChange={(e) => onChange({ ...value, pattern: e.target.value })}
          placeholder={t("searchPanel.search")}
          data-search-input="pattern"
          className="h-7 pl-7 pr-2 text-xs"
        />
      </div>
      <div className="relative">
        <HugeiconsIcon
          icon={ReplaceIcon}
          size={13}
          strokeWidth={2}
          className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={value.replacement}
          onChange={(e) => onChange({ ...value, replacement: e.target.value })}
          placeholder={t("searchPanel.replace")}
          className="h-7 pl-7 pr-2 text-xs"
        />
      </div>
      <div className="flex items-center gap-1">
        <ToggleButton
          active={value.regex}
          label={t("searchPanel.regex")}
          icon={CodeIcon}
          onClick={() => onChange({ ...value, regex: !value.regex })}
        />
        <ToggleButton
          active={value.caseSensitive}
          label={t("searchPanel.caseSensitive")}
          icon={CaseSensitiveIcon}
          onClick={() => onChange({ ...value, caseSensitive: !value.caseSensitive })}
        />
        <ToggleButton
          active={value.whole_word}
          label={t("searchPanel.wholeWord")}
          icon={QuotesIcon}
          onClick={() => onChange({ ...value, whole_word: !value.whole_word })}
        />
        <span className="ml-auto text-[10px] text-muted-foreground">
          {stats
            ? `files: ${stats.filesScanned}  matches: ${stats.totalMatches}${stats.truncated ? ` (${t("searchPanel.truncated")})` : ""}`
            : null}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          value={value.include}
          onChange={(e) => onChange({ ...value, include: e.target.value })}
          placeholder={t("searchPanel.include")}
          className="h-6 flex-1 text-[11px]"
        />
        <Input
          value={value.exclude}
          onChange={(e) => onChange({ ...value, exclude: e.target.value })}
          placeholder={t("searchPanel.exclude")}
          className="h-6 flex-1 text-[11px]"
        />
      </div>
    </div>
  );
}
