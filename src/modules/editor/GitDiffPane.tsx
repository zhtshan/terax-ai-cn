import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { MergeView } from "@codemirror/merge";
import { EditorState, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "@uiw/react-codemirror";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  commitDiffKey,
  commitWorkingDiffKey,
  fetchCommitDiff,
  fetchCommitDiffAgainstWorking,
  fetchWorkingDiff,
  getCachedDiff,
  workingDiffKey,
} from "./lib/diffCache";
import { buildSharedExtensions, DEFAULT_INDENT } from "./lib/extensions";
import { resolveLanguage, resolveLanguageSync } from "./lib/languageResolver";
import { useEditorThemeExt } from "./lib/useEditorThemeExt";

type WorkingSource = {
  kind: "working";
  repoRoot: string;
  path: string;
  mode: "-" | "+";
  originalPath: string | null;
};

type CommitSource = {
  kind: "commit";
  repoRoot: string;
  sha: string;
  path: string;
  originalPath: string | null;
  /** "parent" (default) diffs the commit against its own parent - what this
   * commit changed. "working" diffs it against the current on-disk file -
   * what has changed since this version. */
  compareTo?: "parent" | "working";
};

type Props = {
  source: WorkingSource | CommitSource;
  chipLabel?: string;
  active: boolean;
};

const LARGE_FILE_THRESHOLD = 256 * 1024;

const SHARED_EXT = buildSharedExtensions();
const READONLY_EXT = [
  EditorState.readOnly.of(true),
  EditorView.editable.of(false),
];

const PANE_BASIC_SETUP = basicSetup({
  lineNumbers: true,
  foldGutter: true,
  highlightActiveLine: false,
  highlightActiveLineGutter: false,
  searchKeymap: true,
});

// Shared layout/chrome, identical on both panes of the side-by-side view.
// Only rules that target elements *inside* an editor root belong here -
// EditorView.theme() rewrites any selector without `&` into a descendant
// selector of that editor's own scope class, so it can never reach ancestor
// elements like `.cm-mergeView`/`.cm-mergeViewEditor` (see the imperative
// sizing done on `view.dom`/`view.b.dom` in the mount effect below instead).
const MERGE_LAYOUT_THEME = EditorView.theme({
  ".cm-changeGutter": {
    width: "2px !important",
    paddingLeft: "0 !important",
  },
});

// Left pane (the older/original content) - removed-line styling.
const DIFF_THEME_ORIGINAL = EditorView.theme({
  ".cm-changedText, .cm-deletedChunk .cm-deletedText": {
    background: "rgba(220, 90, 90, 0.22) !important",
    borderRadius: "3px",
    padding: "0 1px",
  },
  ".cm-changedLine, .cm-deletedChunk": {
    backgroundColor: "rgba(220, 90, 90, 0.07) !important",
  },
  ".cm-changedLineGutter, .cm-deletedLineGutter": {
    background: "rgba(220, 90, 90, 0.5) !important",
  },
});

// Right pane (the newer/modified content) - added-line styling.
const DIFF_THEME_MODIFIED = EditorView.theme({
  ".cm-changedText": {
    background: "rgba(110, 200, 120, 0.20) !important",
    borderRadius: "3px",
    padding: "0 1px",
  },
  ".cm-changedLine": {
    backgroundColor: "rgba(110, 200, 120, 0.07) !important",
  },
  ".cm-changedLineGutter": {
    background: "rgba(110, 200, 120, 0.55) !important",
  },
});

function countDiffLines(patch: string): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (let i = 0; i < patch.length; i++) {
    if (i > 0 && patch.charCodeAt(i - 1) !== 10) continue;
    const c = patch.charCodeAt(i);
    if (c === 43 && patch.charCodeAt(i + 1) !== 43) added++;
    else if (c === 45 && patch.charCodeAt(i + 1) !== 45) removed++;
  }
  if (patch.length > 0 && patch.charCodeAt(0) === 43) added++;
  else if (patch.length > 0 && patch.charCodeAt(0) === 45) removed++;
  return { added, removed };
}

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | {
      kind: "loaded";
      originalContent: string;
      modifiedContent: string;
      isBinary: boolean;
      fallbackPatch: string;
      /** null until resolved; the mount effect rebuilds the merge view once
       * it lands so syntax highlighting isn't stuck on plain text. */
      langExt: Extension | null;
    }
  | { kind: "error"; message: string };

function cacheKey(source: WorkingSource | CommitSource): string {
  if (source.kind === "working") {
    return workingDiffKey(source.repoRoot, source.path, source.mode);
  }
  return source.compareTo === "working"
    ? commitWorkingDiffKey(source.repoRoot, source.sha, source.path)
    : commitDiffKey(source.repoRoot, source.sha, source.path);
}

function loadStateFromCache(source: WorkingSource | CommitSource): LoadState {
  // The commit-vs-working comparison is never persisted (see
  // fetchCommitDiffAgainstWorking) since the working side can go stale.
  if (source.kind === "commit" && source.compareTo === "working") {
    return { kind: "idle" };
  }
  const hit = getCachedDiff(cacheKey(source));
  if (!hit) return { kind: "idle" };
  return {
    kind: "loaded",
    originalContent: hit.originalContent,
    modifiedContent: hit.modifiedContent,
    isBinary: hit.isBinary,
    fallbackPatch: hit.fallbackPatch,
    langExt: resolveLanguageSync(source.path)?.ext ?? null,
  };
}

export function GitDiffPane({ source, chipLabel, active }: Props) {
  const { t } = useTranslation();
  const themeExt = useEditorThemeExt();
  const mergeContainerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<LoadState>(() =>
    active ? loadStateFromCache(source) : { kind: "idle" },
  );

  const key = cacheKey(source);

  useEffect(() => {
    if (!active) return;
    const cached = loadStateFromCache(source);
    if (cached.kind === "loaded") {
      setState(cached);
      return;
    }
    let cancelled = false;
    setState({ kind: "loading" });
    const promise =
      source.kind === "working"
        ? fetchWorkingDiff(
            source.repoRoot,
            source.path,
            source.mode,
            source.originalPath,
          )
        : source.compareTo === "working"
          ? fetchCommitDiffAgainstWorking(
              source.repoRoot,
              source.sha,
              source.path,
              source.originalPath,
            )
          : fetchCommitDiff(
              source.repoRoot,
              source.sha,
              source.path,
              source.originalPath,
            );
    Promise.all([promise, resolveLanguage(source.path).catch(() => null)])
      .then(([res, lang]) => {
        if (cancelled) return;
        setState({
          kind: "loaded",
          originalContent: res.originalContent,
          modifiedContent: res.modifiedContent,
          isBinary: res.isBinary,
          fallbackPatch: res.fallbackPatch,
          langExt: lang?.ext ?? null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          kind: "error",
          message:
            err && typeof err === "object" && "message" in err
              ? String((err as { message: unknown }).message)
              : String(err),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [active, key, source]);

  const path = source.path;
  const repoRoot = source.repoRoot;
  const mode = source.kind === "working" ? source.mode : "+";
  const compareToWorking =
    source.kind === "commit" && source.compareTo === "working";
  const loaded = state.kind === "loaded" ? state : null;
  const originalContent = loaded?.originalContent ?? "";
  const modifiedContent = loaded?.modifiedContent ?? "";
  const isBinary = loaded?.isBinary ?? false;
  const fallbackPatch = loaded?.fallbackPatch ?? "";

  const isTooLarge =
    originalContent.length > LARGE_FILE_THRESHOLD ||
    modifiedContent.length > LARGE_FILE_THRESHOLD;
  const useFallback = isBinary || isTooLarge;

  const langExt = loaded?.langExt ?? null;

  // Cache-hit path only: the diff came from the cache before the language
  // pack was imported. Resolve once and let the mount effect below pick it up.
  useEffect(() => {
    if (useFallback || state.kind !== "loaded" || state.langExt) return;
    let cancelled = false;
    resolveLanguage(path).then((res) => {
      if (cancelled || !res) return;
      setState((s) => (s.kind === "loaded" ? { ...s, langExt: res.ext } : s));
    });
    return () => {
      cancelled = true;
    };
  }, [useFallback, path, state]);

  // Side-by-side (VS Code style) diff: two independent, vertically-aligned
  // read-only editors wired together by @codemirror/merge's `MergeView`,
  // rebuilt whenever the content/language/theme changes.
  useEffect(() => {
    if (useFallback || state.kind !== "loaded") return;
    const container = mergeContainerRef.current;
    if (!container) return;
    const sharedExt: Extension[] = [
      ...SHARED_EXT,
      DEFAULT_INDENT,
      langExt ?? [],
      ...READONLY_EXT,
      themeExt,
      MERGE_LAYOUT_THEME,
      PANE_BASIC_SETUP,
    ];
    const view = new MergeView({
      a: {
        doc: originalContent,
        extensions: [...sharedExt, DIFF_THEME_ORIGINAL],
      },
      b: {
        doc: modifiedContent,
        extensions: [...sharedExt, DIFF_THEME_MODIFIED],
      },
      parent: container,
      highlightChanges: true,
      gutter: true,
    });
    // `.cm-mergeView` and its pane wrappers sit *outside* both editor roots,
    // so EditorView.theme() can't reach them (see MERGE_LAYOUT_THEME above) -
    // size and divide them directly instead. Without an explicit height the
    // view grows to fit its full content and nothing scrolls.
    view.dom.style.height = "100%";
    view.dom.style.overflowY = "auto";
    const rightWrap = view.b.dom.parentElement;
    if (rightWrap) rightWrap.style.borderLeft = "1px solid var(--border)";

    // Right-edge diff overview bar. The merge view has no built-in mapbar, so
    // overlay one in JS: chunk positions via `lineBlockAt` are document-relative,
    // so marks stay put while content scrolls; only a resize/rebuild re-runs.
    container.style.position = "relative";
    const bar = document.createElement("div");
    bar.className = "diff-mapbar";
    container.appendChild(bar);

    const layout = () => {
      bar.replaceChildren();
      const barHeight = container.clientHeight;
      const contentHeight = view.a.contentHeight;
      if (!barHeight || !contentHeight) return;
      const scale = barHeight / contentHeight;
      view.chunks.forEach((chunk) => {
        const markerTop = view.a.lineBlockAt(chunk.fromA).top * scale;
        if (markerTop > barHeight) return;
        const added = chunk.fromA === chunk.toA;
        const removed = chunk.fromB === chunk.toB;
        const el = document.createElement("div");
        el.className = added
          ? "diff-mapbar-chunk added"
          : removed
            ? "diff-mapbar-chunk removed"
            : "diff-mapbar-chunk mixed";
        el.title = t("editor.diff.jumpToDiff");
        el.style.top = `${markerTop}px`;
        el.style.height = `${Math.max(3, (chunk.endA - chunk.fromA) * 0.6 * scale + 1)}px`;
        el.addEventListener("mousedown", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          view.dom.scrollTop = Math.max(
            0,
            view.a.lineBlockAt(chunk.fromA).top -
              view.a.defaultLineHeight * 2.5,
          );
        });
        bar.appendChild(el);
      });
    };
    bar.addEventListener("mousedown", (ev) => {
      if ((ev.target as HTMLElement).classList.contains("diff-mapbar-chunk"))
        return;
      const rect = bar.getBoundingClientRect();
      const fraction = Math.min(
        1,
        Math.max(0, (ev.clientY - rect.top) / rect.height),
      );
      view.dom.scrollTop =
        fraction * (view.dom.scrollHeight - view.dom.clientHeight);
    });

    let nextLayoutFrame = 0;
    const scheduleLayout = () => {
      cancelAnimationFrame(nextLayoutFrame);
      nextLayoutFrame = requestAnimationFrame(layout);
    };
    // The merge view measures its line blocks on the frames after mount, so
    // re-run the layout a few frames in a row until positions settle.
    const settle = (frames: number) => {
      nextLayoutFrame = requestAnimationFrame(() => {
        layout();
        if (frames > 1) settle(frames - 1);
      });
    };
    settle(3);
    const ro = new ResizeObserver(scheduleLayout);
    ro.observe(container);

    return () => {
      cancelAnimationFrame(nextLayoutFrame);
      ro.disconnect();
      bar.remove();
      view.destroy();
    };
  }, [
    useFallback,
    state.kind,
    originalContent,
    modifiedContent,
    langExt,
    themeExt,
    t,
  ]);

  const stats = useMemo(
    () =>
      useFallback ? countDiffLines(fallbackPatch) : { added: 0, removed: 0 },
    [useFallback, fallbackPatch],
  );

  return (
    <div className="flex h-full min-h-0 flex-col rounded-md border border-border/60 bg-background">
      <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-border/60 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Badge
            variant="outline"
            className="text-[10px] uppercase tracking-wide"
          >
            {chipLabel ?? mode}
          </Badge>
          {compareToWorking ? (
            <Badge variant="secondary" className="text-[10px]">
              {t("editor.diff.compareToWorking")}
            </Badge>
          ) : null}
          {isBinary ? (
            <Badge variant="secondary" className="text-[10px]">
              {t("editor.diff.binaryBadge")}
            </Badge>
          ) : isTooLarge ? (
            <Badge variant="secondary" className="text-[10px]">
              {t("editor.diff.largeFileBadge")}
            </Badge>
          ) : null}
          <span
            className="truncate font-mono text-[11px] text-muted-foreground"
            title={path}
          >
            {path}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-[10.5px] tabular-nums text-muted-foreground">
          <span className="truncate max-w-80 font-mono">{repoRoot}</span>
          {useFallback ? (
            <>
              <span className="text-emerald-600 dark:text-emerald-400">
                +{stats.added}
              </span>
              <span className="text-rose-600 dark:text-rose-400">
                −{stats.removed}
              </span>
            </>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {state.kind === "loading" || state.kind === "idle" ? (
          <div className="flex h-full items-center justify-center gap-2 text-[11px] text-muted-foreground">
            <Spinner className="size-3" />
            {t("editor.diff.loading")}
          </div>
        ) : state.kind === "error" ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-[11.5px] text-destructive">
            {state.message}
          </div>
        ) : useFallback ? (
          <ScrollArea className="h-full">
            <pre className="min-h-full whitespace-pre-wrap wrap-break-word p-4 font-mono text-[12px] leading-relaxed text-muted-foreground">
              {fallbackPatch || t("editor.diff.unavailable")}
            </pre>
          </ScrollArea>
        ) : (
          <div ref={mergeContainerRef} className="h-full" />
        )}
      </div>
    </div>
  );
}
