import { useCallback, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { checkWritableCanonical } from "@/modules/ai/lib/security";
import { replaceAll } from "../lib/api";
import type {
  GrepResponse,
  ReplaceError,
  ReplaceFileResult,
  ReplaceInput,
} from "../lib/types";

export type ReplaceState =
  | { kind: "idle" }
  | { kind: "previewing"; files: number; matches: number }
  | { kind: "running" }
  | {
      kind: "done";
      filesChanged: ReplaceFileResult[];
      totalReplacements: number;
    }
  | {
      kind: "partial";
      filesChanged: ReplaceFileResult[];
      errors: ReplaceError[];
      totalReplacements: number;
    }
  | { kind: "error"; message: string };

export type UseReplaceRunOptions = {
  results: GrepResponse | null;
  replacement: string;
  input: Omit<ReplaceInput, "replacement"> | null;
};

function countHits(results: GrepResponse): { files: number; matches: number } {
  const byFile = new Map<string, number>();
  for (const hit of results.hits) {
    byFile.set(hit.path, (byFile.get(hit.path) ?? 0) + 1);
  }
  return { files: byFile.size, matches: results.hits.length };
}

async function canonicalize(path: string): Promise<string> {
  return invoke<string>("fs_canonicalize", { path });
}

export function useReplaceRun(options: UseReplaceRunOptions): {
  state: ReplaceState;
  preview: () => void;
  replace: () => Promise<void>;
} {
  const { results, replacement, input } = options;
  const [state, setState] = useState<ReplaceState>({ kind: "idle" });

  const counts = useMemo(() => {
    if (!results) return { files: 0, matches: 0 };
    return countHits(results);
  }, [results]);

  const preview = useCallback(() => {
    if (!results) return;
    if (counts.matches === 0) {
      setState({ kind: "idle" });
      return;
    }
    setState({
      kind: "previewing",
      files: counts.files,
      matches: counts.matches,
    });
  }, [counts, results]);

  const replace = useCallback(async () => {
    if (!input || !results) return;
    if (replacement.length === 0) {
      setState({ kind: "error", message: "Replacement is empty" });
      return;
    }
    if (counts.matches === 0) {
      setState({
        kind: "done",
        filesChanged: [],
        totalReplacements: 0,
      });
      return;
    }

    // 1. Deny-list gate: refuse whole batch if any path fails.
    // A single blocked path aborts the whole batch — we don't want to
    // half-write across a security boundary.
    const checkedPaths = new Set<string>();
    for (const hit of results.hits) {
      if (checkedPaths.has(hit.path)) continue;
      checkedPaths.add(hit.path);
      const check = await checkWritableCanonical(hit.path, canonicalize);
      if (!check.ok) {
        setState({
          kind: "error",
          message: `Refused: ${hit.path} (${check.reason})`,
        });
        return;
      }
    }

    // 2. Run replace.
    setState({ kind: "running" });
    try {
      const resp = await replaceAll({ ...input, replacement });
      if (resp.errors.length === 0) {
        setState({
          kind: "done",
          filesChanged: resp.files_changed,
          totalReplacements: resp.total_replacements,
        });
      } else if (resp.files_changed.length === 0) {
        setState({
          kind: "error",
          message: resp.errors[0]?.reason ?? "Replace failed",
        });
      } else {
        setState({
          kind: "partial",
          filesChanged: resp.files_changed,
          errors: resp.errors,
          totalReplacements: resp.total_replacements,
        });
      }
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [counts, input, replacement, results]);

  return { state, preview, replace };
}
