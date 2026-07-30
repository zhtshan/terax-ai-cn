import type { SearchInput } from "./types";

export type BuildSearchInputOpts = {
  pattern: string;
  root: string;
  regex: boolean;
  caseSensitive: boolean;
  wholeWord: boolean;
  include: string;
  exclude: string;
  max_results?: number;
};

function normalizeGlob(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function buildSearchInput(opts: BuildSearchInputOpts): SearchInput {
  return {
    pattern: opts.pattern,
    root: opts.root,
    regex: opts.regex,
    caseSensitive: opts.caseSensitive,
    wholeWord: opts.wholeWord,
    include: normalizeGlob(opts.include),
    exclude: normalizeGlob(opts.exclude),
    max_results: opts.max_results ?? null,
  };
}
