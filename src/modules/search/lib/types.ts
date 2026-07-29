export type ContentHit = {
  path: string;
  rel: string;
  line: number;
  text: string;
};

export type GrepResponse = {
  hits: ContentHit[];
  truncated: boolean;
  files_scanned: number;
};

export type ReplaceFileResult = {
  path: string;
  replacements: number;
};

export type ReplaceError = {
  path: string;
  reason: string;
};

export type ReplaceResponse = {
  files_changed: ReplaceFileResult[];
  errors: ReplaceError[];
  total_replacements: number;
  truncated: boolean;
};

export type SearchInput = {
  pattern: string;
  root: string;
  regex: boolean;
  case_sensitive: boolean;
  whole_word: boolean;
  include?: string | null;
  exclude?: string | null;
  max_results?: number | null;
};

export type ReplaceInput = SearchInput & { replacement: string };
