export { SearchPanel, type SearchPanelHandle, type SearchPanelProps } from "./SearchPanel";
export { SearchInput, type SearchInputOptions, type SearchInputProps, type SearchInputStats } from "./SearchInput";
export { SearchResults, type SearchResultsProps } from "./SearchResults";
export { ReplaceAffectedBar, type ReplaceAffectedBarProps } from "./ReplaceAffectedBar";

export { useSearchRun, type UseSearchRunOptions, type UseSearchRunState } from "./hooks/useSearchRun";
export {
  useReplaceRun,
  type ReplaceState,
  type UseReplaceRunOptions,
} from "./hooks/useReplaceRun";

export { buildSearchInput, type BuildSearchInputOpts } from "./lib/mode";
export { splitHits, type HighlightOptions, type HighlightSegment } from "./lib/highlight";
export { searchContent } from "./lib/api";
export { replaceAll } from "./lib/api";
export type {
  ContentHit,
  GrepResponse,
  ReplaceFileResult,
  ReplaceError,
  ReplaceResponse,
  SearchInput as SearchInputPayload,
  ReplaceInput,
} from "./lib/types";
