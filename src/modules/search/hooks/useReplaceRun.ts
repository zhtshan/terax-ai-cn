import { useCallback, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { checkWritableCanonical } from "@/modules/ai/lib/security";
import { currentWorkspaceEnv } from "@/modules/workspace";
import { replaceAll } from "../lib/api";
import type {
  GrepResponse,
  ReplaceError,
  ReplaceFileResult,
  ReplaceInput,
} from "../lib/types";

export type ReplaceState =
  | { kind: "idle" }
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
  // I4: thread the current workspace env so the Rust side can resolve
  // WSL / non-canonical paths the same way it does for the search and
  // replace IPC calls. Without this, a WSL hit returned as a relative
  // path under the project root would canonicalize to a different
  // (or nonexistent) path on the host, breaking the deny-list gate.
  return invoke<string>("fs_canonicalize", { path, workspace: currentWorkspaceEnv() });
}

export function useReplaceRun(options: UseReplaceRunOptions): {
  state: ReplaceState;
  replace: () => Promise<void>;
} {
  const { results, replacement, input } = options;
  const [state, setState] = useState<ReplaceState>({ kind: "idle" });

  // I3: a synchronous re-entry guard for `replace()`. The deny-list gate
  // is async, so `state.kind` stays "idle" / "done" / etc. throughout the
  // gate, leaving the Replace button enabled and exposing a double-click
  // race where two `replaceAll` invocations run back-to-back. This ref
  // closes the window between click and `setState({ kind: "running" })`.
  const inFlightRef = useRef(false);

  const counts = useMemo(() => {
    if (!results) return { files: 0, matches: 0 };
    return countHits(results);
  }, [results]);

  const replace = useCallback(async () => {
    if (!input || !results) return;
    if (inFlightRef.current) return;
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

    inFlightRef.current = true;

    // 1. Deny-list gate: refuse whole batch if any path fails.
    // A single blocked path aborts the whole batch — we don't want to
    // half-write across a security boundary.
    try {
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
    } finally {
      inFlightRef.current = false;
    }
  }, [counts, input, replacement, results]);

  return { state, replace };
}
