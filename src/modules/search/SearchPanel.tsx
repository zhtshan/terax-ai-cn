import { forwardRef, useImperativeHandle, useMemo } from "react";
import { SearchInput, type SearchInputOptions } from "./SearchInput";
import { SearchResults } from "./SearchResults";
import { ReplaceAffectedBar } from "./ReplaceAffectedBar";
import type { GrepResponse } from "./lib/types";
import type { ReplaceState } from "./hooks/useReplaceRun";

export type SearchPanelHandle = {
  focusSearchInput: () => void;
};

export type SearchPanelProps = {
  rootPath: string | null;
  options: SearchInputOptions;
  onOptionsChange: (next: SearchInputOptions) => void;
  results: GrepResponse | null;
  loading: boolean;
  error: string | null;
  replaceState: ReplaceState;
  onReplace: () => void;
};

export const SearchPanel = forwardRef<SearchPanelHandle, SearchPanelProps>(function SearchPanel(
  {
    rootPath,
    options,
    onOptionsChange,
    results,
    loading,
    error,
    replaceState,
    onReplace,
  },
  ref,
) {
  useImperativeHandle(
    ref,
    () => ({
      focusSearchInput: () => {
        const el = document.querySelector<HTMLInputElement>(
          'input[data-search-input="pattern"]',
        );
        el?.focus();
      },
    }),
    [],
  );

  const stats = useMemo(() => {
    if (!results) return null;
    return {
      filesScanned: results.files_scanned,
      totalMatches: results.hits.length,
      truncated: results.truncated,
    };
  }, [results]);

  const affectedCounts = useMemo(() => {
    if (!results) return { files: 0, matches: 0 };
    const byFile = new Map<string, number>();
    for (const hit of results.hits) {
      byFile.set(hit.path, (byFile.get(hit.path) ?? 0) + 1);
    }
    return { files: byFile.size, matches: results.hits.length };
  }, [results]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SearchInput value={options} onChange={onOptionsChange} stats={stats} rootPath={rootPath} />
      {error ? (
        <div className="px-3 py-2 text-[11px] text-destructive">{error}</div>
      ) : null}
      {loading ? (
        <div className="px-3 py-1 text-[11px] text-muted-foreground">Searching…</div>
      ) : null}
      <SearchResults
        hits={results?.hits ?? []}
        pattern={options.pattern}
        options={{
          regex: options.regex,
          case_sensitive: options.case_sensitive,
          whole_word: options.whole_word,
        }}
        truncated={results?.truncated}
      />
      <ReplaceAffectedBar
        replacement={options.replacement}
        affectedFiles={affectedCounts.files}
        totalMatches={affectedCounts.matches}
        replaceState={replaceState}
        onReplace={onReplace}
      />
    </div>
  );
});