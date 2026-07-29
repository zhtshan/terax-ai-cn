import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from "react";
import { SearchInput, type SearchInputOptions, type SearchInputStats } from "./SearchInput";
import { SearchResults } from "./SearchResults";
import { ReplaceAffectedBar } from "./ReplaceAffectedBar";
import { useSearchRun } from "./hooks/useSearchRun";
import { useReplaceRun } from "./hooks/useReplaceRun";
import { buildSearchInput } from "./lib/mode";

export type SearchPanelHandle = {
  focusSearchInput: () => void;
};

export type SearchPanelProps = {
  rootPath: string | null;
};

export const SearchPanel = forwardRef<SearchPanelHandle, SearchPanelProps>(function SearchPanel(
  { rootPath },
  ref,
) {
  const [options, setOptions] = useState<SearchInputOptions>({
    pattern: "",
    replacement: "",
    regex: false,
    case_sensitive: false,
    whole_word: false,
    include: "",
    exclude: "",
  });

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

  const built = useMemo(() => {
    if (!rootPath) return null;
    if (options.pattern.length === 0) return null;
    return buildSearchInput({
      ...options,
      root: rootPath,
    });
  }, [options, rootPath]);

  const search = useSearchRun({ input: built, enabled: built !== null });
  const replace = useReplaceRun({
    results: search.results,
    replacement: options.replacement,
    input: built,
  });

  const stats: SearchInputStats | null = useMemo(() => {
    if (!search.results) return null;
    return {
      filesScanned: search.results.files_scanned,
      totalMatches: search.results.hits.length,
      truncated: search.results.truncated,
    };
  }, [search.results]);

  const affectedCounts = useMemo(() => {
    if (!search.results) return { files: 0, matches: 0 };
    const byFile = new Map<string, number>();
    for (const hit of search.results.hits) {
      byFile.set(hit.path, (byFile.get(hit.path) ?? 0) + 1);
    }
    return { files: byFile.size, matches: search.results.hits.length };
  }, [search.results]);

  const onReplaceClick = useCallback(() => {
    void replace.replace();
  }, [replace]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SearchInput
        value={options}
        onChange={setOptions}
        stats={stats}
        rootPath={rootPath}
      />
      {search.error ? (
        <div className="px-3 py-2 text-[11px] text-destructive">{search.error}</div>
      ) : null}
      <SearchResults
        hits={search.results?.hits ?? []}
        pattern={options.pattern}
        options={{
          regex: options.regex,
          case_sensitive: options.case_sensitive,
          whole_word: options.whole_word,
        }}
        truncated={search.results?.truncated}
      />
      <ReplaceAffectedBar
        replacement={options.replacement}
        affectedFiles={affectedCounts.files}
        totalMatches={affectedCounts.matches}
        replaceState={replace.state}
        onReplace={onReplaceClick}
      />
    </div>
  );
});