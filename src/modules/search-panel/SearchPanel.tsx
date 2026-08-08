import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { invoke } from "@tauri-apps/api/core";
import { currentWorkspaceEnv } from "@/modules/workspace";
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { fileIconUrl } from "@/modules/explorer/lib/iconResolver";
import { cn } from "@/lib/utils";

type GrepHit = {
  path: string;
  rel: string;
  line: number;
  text: string;
};

type GrepResponse = {
  hits: GrepHit[];
  truncated: boolean;
  files_scanned: number;
};

type ReplaceResult = {
  files_replaced: number;
  failures: string[];
};

const DEBOUNCE_MS = 200;
const LIMIT = 200;

type SearchOptions = {
  caseSensitive: boolean;
  wholeWord: boolean;
  regex: boolean;
  includeGlob: string;
  excludeGlob: string;
};

type FileGroup = {
  path: string;
  rel: string;
  hits: GrepHit[];
};

function highlightMatch(text: string, pattern: string, regex: boolean): React.ReactNode {
  if (!pattern) return text;
  try {
    const flags = regex ? "g" : "gi";
    const re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
    const parts = text.split(re);
    const matches = text.match(re) || [];
    const result: React.ReactNode[] = [];
    parts.forEach((part, i) => {
      result.push(<span key={`t${i}`}>{part}</span>);
      if (matches[i]) {
        result.push(
          <span
            key={`m${i}`}
            className="bg-yellow-500/30 text-yellow-200 rounded px-0.5"
          >
            {matches[i]}
          </span>,
        );
      }
    });
    return result;
  } catch {
    return text;
  }
}

type Props = {
  rootPath: string;
  onOpenContentHit: (path: string, line: number) => void;
};

export type SearchPanelHandle = {
  focus: () => void;
  isFocused: () => boolean;
};

export const SearchPanel = memo(
  forwardRef<SearchPanelHandle, Props>(function SearchPanel(
    { rootPath, onOpenContentHit },
    ref,
  ) {
    const { t } = useTranslation();
    const [query, setQuery] = useState("");
    const [replaceQuery, setReplaceQuery] = useState("");
    const [options, setOptions] = useState<SearchOptions>({
      caseSensitive: false,
      wholeWord: false,
      regex: false,
      includeGlob: "",
      excludeGlob: "",
    });
    const [results, setResults] = useState<GrepHit[]>([]);
    const [loading, setLoading] = useState(false);
    const [truncated, setTruncated] = useState(false);
    const [showReplace, setShowReplace] = useState(false);
    const [showGlob, setShowGlob] = useState(false);
    const [replacedCount, setReplacedCount] = useState<number | null>(null);
    const [errors, setErrors] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const replaceInputRef = useRef<HTMLInputElement>(null);
    const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          requestAnimationFrame(() => inputRef.current?.focus());
        },
        isFocused: () => document.activeElement === inputRef.current,
      }),
      [],
    );

    const toggleFile = useCallback((path: string) => {
      setExpandedFiles((prev) => {
        const next = new Set(prev);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
        }
        return next;
      });
    }, []);

    const toggleOpt = useCallback((key: keyof SearchOptions) => {
      setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const groupedResults = useMemo<FileGroup[]>(() => {
      const map = new Map<string, FileGroup>();
      for (const hit of results) {
        let g = map.get(hit.path);
        if (!g) {
          g = { path: hit.path, rel: hit.rel, hits: [] };
          map.set(hit.path, g);
        }
        g.hits.push(hit);
      }
      return Array.from(map.values()).sort((a, b) => a.rel.localeCompare(b.rel));
    }, [results]);

    const active = query.trim().length > 0;

    useEffect(() => {
      if (!active) {
        setResults([]);
        setTruncated(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      let alive = true;
      const q = query.trim();
      const timeout = setTimeout(async () => {
        try {
          const res = await invoke<GrepResponse>("fs_grep", {
            pattern: q,
            root: rootPath,
            glob: [
              options.includeGlob.trim(),
              options.excludeGlob.trim(),
            ].filter(Boolean),
            case_insensitive: options.caseSensitive ? false : undefined,
            whole_word: options.wholeWord,
            max_results: LIMIT,
            workspace: currentWorkspaceEnv(),
          });
          if (alive) {
            setResults(res.hits);
            setTruncated(res.truncated);
          }
        } catch (e) {
          if (alive) {
            console.error("fs_grep failed:", e);
            setResults([]);
            setTruncated(false);
          }
        } finally {
          if (alive) setLoading(false);
        }
      }, DEBOUNCE_MS);

      return () => {
        alive = false;
        clearTimeout(timeout);
      };
    }, [query, rootPath, options.caseSensitive, options.includeGlob, options.excludeGlob]);

    const handleReplaceAll = useCallback(async () => {
      if (!query.trim() || !replaceQuery.trim()) return;
      try {
        const res = await invoke<ReplaceResult>("fs_replace", {
          pattern: query.trim(),
          replacement: replaceQuery,
          root: rootPath,
          glob: [
            options.includeGlob.trim(),
            options.excludeGlob.trim(),
          ].filter(Boolean),
          case_insensitive: options.caseSensitive ? false : undefined,
          workspace: currentWorkspaceEnv(),
        });
        setReplacedCount(res.files_replaced);
        setErrors(res.failures);
      } catch (e) {
        setErrors([String(e)]);
      }
    }, [query, replaceQuery, rootPath, options.caseSensitive, options.includeGlob, options.excludeGlob]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          inputRef.current?.blur();
          return;
        }
      },
      [],
    );

    const pattern = options.regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    return (
      <div className="flex h-full flex-col">
        <div className="flex h-8 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <span className="flex flex-1 items-center text-xs font-medium text-foreground/80">
            {t("sidebar.search")}
          </span>
          <button
            type="button"
            onClick={() => setShowReplace((v) => !v)}
            className={cn(
              "rounded px-1.5 py-0.5 text-[11px] transition-colors",
              showReplace
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            title={t("search.replaceToggle")}
          >
            {t("search.replace")}
          </button>
          <button
            type="button"
            onClick={() => setShowGlob((v) => !v)}
            className={cn(
              "rounded px-1.5 py-0.5 text-[11px] transition-colors",
              showGlob
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            title={t("search.globToggle")}
          >
            {t("search.glob")}
          </button>
        </div>

        <div className="flex shrink-0 flex-col gap-1.5 p-2">
          <div className="relative">
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("search.placeholder")}
              className="h-7 pr-7 pl-6.5 text-xs"
            />
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              size={11}
              strokeWidth={2}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground"
            />
          </div>

          <div className="flex items-center gap-1">
            <OptionBtn
              active={options.caseSensitive}
              onClick={() => toggleOpt("caseSensitive")}
              label="Aa"
              title={t("search.caseSensitive")}
            />
            <OptionBtn
              active={options.wholeWord}
              onClick={() => toggleOpt("wholeWord")}
              label="ab"
              title={t("search.wholeWord")}
            />
            <OptionBtn
              active={options.regex}
              onClick={() => toggleOpt("regex")}
              label=".*"
              title={t("search.regex")}
            />
          </div>

          {showReplace ? (
            <div className="flex flex-col gap-1">
              <div className="relative">
                <Input
                  ref={replaceInputRef}
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  placeholder={t("search.replacePlaceholder")}
                  className="h-7 pr-7 pl-6.5 text-xs"
                />
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={handleReplaceAll}
                  disabled={!query.trim() || !replaceQuery.trim()}
                  className={cn(
                    "flex-1 rounded text-[11px] py-1 transition-colors",
                    query.trim() && replaceQuery.trim()
                      ? "bg-primary/20 text-primary hover:bg-primary/30"
                      : "bg-accent/50 text-muted-foreground cursor-not-allowed",
                  )}
                >
                  {t("search.replaceAll")}
                </button>
              </div>
              {replacedCount != null && (
                <div className="text-[11px] text-muted-foreground">
                  {t("search.replacedCount", { count: replacedCount })}
                </div>
              )}
              {errors.length > 0 && (
                <div className="text-[11px] text-destructive">
                  {errors.map((e, i) => (
                    <div key={i}>{e}</div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {showGlob ? (
            <div className="flex flex-col gap-1">
              <Input
                value={options.includeGlob}
                onChange={(e) => setOptions((p) => ({ ...p, includeGlob: e.target.value }))}
                placeholder={t("search.includeGlob")}
                className="h-7 text-xs"
              />
              <Input
                value={options.excludeGlob}
                onChange={(e) => setOptions((p) => ({ ...p, excludeGlob: e.target.value }))}
                placeholder={t("search.excludeGlob")}
                className="h-7 text-xs"
              />
            </div>
          ) : null}
        </div>

        <ScrollArea className="min-h-0 flex-1">
          {loading && results.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-muted-foreground">
              {t("search.searching")}
            </div>
          ) : results.length === 0 && active && !loading ? (
            <div className="px-3 py-2 text-[11px] text-muted-foreground">
              {t("search.noMatches")}
            </div>
          ) : (
            <div className="pb-2">
              {groupedResults.map((group) => {
                const isExpanded = expandedFiles.has(group.path);
                return (
                  <div key={group.path}>
                    <button
                      type="button"
                      onClick={() => toggleFile(group.path)}
                      className="flex w-full items-center gap-1 px-2 py-1 text-left text-xs transition-colors hover:bg-accent/50"
                    >
                      <HugeiconsIcon
                        icon={isExpanded ? ArrowUp01Icon : ArrowDown01Icon}
                        size={10}
                        strokeWidth={2}
                        className="shrink-0 text-muted-foreground"
                      />
                      <img
                        src={fileIconUrl(group.rel)}
                        alt=""
                        className="size-3.5 shrink-0"
                      />
                      <span className="truncate text-[11px] font-medium text-foreground/90">
                        {group.rel}
                      </span>
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {group.hits.length}
                      </span>
                    </button>
                    {isExpanded ? (
                      group.hits.map((hit) => (
                        <button
                          key={`${hit.path}:${hit.line}`}
                          type="button"
                          onClick={() => onOpenContentHit(hit.path, hit.line)}
                          className="flex w-full items-start gap-2 px-2 py-0.5 pl-5 text-left text-[11px] transition-colors hover:bg-accent/30"
                        >
                          <span className="shrink-0 text-[10px] text-muted-foreground w-6 text-right">
                            {hit.line}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-mono">
                            {highlightMatch(hit.text, pattern, options.regex)}
                          </span>
                        </button>
                      ))
                    ) : null}
                  </div>
                );
              })}
              {truncated && results.length > 0 ? (
                <div className="px-3 py-1.5 text-[10px] text-muted-foreground">
                  {t("search.partialResults")}
                </div>
              ) : null}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }),
);

function OptionBtn({
  active,
  onClick,
  label,
  title,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-mono transition-colors",
        active
          ? "bg-primary/20 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
