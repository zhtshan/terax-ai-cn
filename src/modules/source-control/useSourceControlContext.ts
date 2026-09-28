import { native } from "@/modules/ai/lib/native";
import { listenFsChanged } from "@/modules/explorer/lib/watch";
import type { SidebarViewId } from "@/modules/sidebar";
import type { Tab } from "@/modules/tabs";
import { useBlockController } from "@/modules/terminal/lib/blockController";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  activeRepositoryContextPath,
  gitGraphRepositoryPath,
  sourceControlRepositoryPath,
  type SourceControlRepositoryTarget,
} from "./repositoryTarget";
import { useSourceControl } from "./useSourceControl";

// fs 触发的刷新沿用 useSourceControl 的 1500ms 最小间隔，不绕过其他路径的节流；
// 2000ms 上限窗口（同 fs watcher MAX_WINDOW 的延迟封顶思路）保证持续变更下
// 刷新最迟在突发首个触发后 2s 内执行，不会无限推迟。
const FS_REFRESH_DEBOUNCE_MS = 400;
const FS_REFRESH_MIN_INTERVAL_MS = 1500;
const FS_REFRESH_MAX_WAIT_MS = 2000;

type Params = {
  activeTab: Tab | undefined;
  tabs: Tab[];
  activeLeafId: number | null;
  activeTerminalLeafCwd: string | null;
  explorerRoot: string | null;
  launchCwd: string | null;
  launchCwdResolved: boolean;
  home: string | null;
  sidebarView: SidebarViewId;
  repositoryTarget: SourceControlRepositoryTarget;
  cycleSidebarView: (view: SidebarViewId) => void;
  openCommitHistoryTab: (args: {
    repoRoot: string;
    branch: string | null;
  }) => void;
};

/**
 * Resolves the source-control context path off the active tab and feeds the
 * source-control summary. When git is not active the badge tracks a stable
 * per-session path so tab switches / cd don't re-fire git IPC.
 */
export function useSourceControlContext({
  activeTab,
  tabs,
  activeLeafId,
  activeTerminalLeafCwd,
  explorerRoot,
  launchCwd,
  launchCwdResolved,
  home,
  sidebarView,
  repositoryTarget,
  cycleSidebarView,
  openCommitHistoryTab,
}: Params) {
  const workspaceFallbackPath = launchCwdResolved
    ? (launchCwd ?? home ?? null)
    : null;
  const sourceControlContextPath = activeRepositoryContextPath({
    activeTab,
    activeTerminalLeafCwd,
    explorerRoot,
    workspaceFallbackPath,
  });
  const hasOpenGitTab = useMemo(
    () =>
      tabs.some(
        (t) =>
          t.kind === "git-diff" ||
          t.kind === "git-history" ||
          t.kind === "git-commit-file",
      ),
    [tabs],
  );
  // Ambient path tracks the explorer root so the rail badge and explorer git
  // decorations reflect the repo you are actually looking at. cd-within-repo
  // churn is absorbed by the status TTL + reusable-root path in useSourceControl.
  const badgeContextPath = explorerRoot ?? workspaceFallbackPath;
  const sourceControlPath = sourceControlRepositoryPath({
    contextPath: sourceControlContextPath,
    badgeContextPath,
    sidebarView,
    hasOpenGitTab,
    target: repositoryTarget,
  });
  const graphContextPath = gitGraphRepositoryPath({
    contextPath: sourceControlContextPath,
    sidebarView,
    target: repositoryTarget,
  });
  const sourceControl = useSourceControl(sourceControlPath, true);

  // A terminal command finishing (e.g. `git checkout`) doesn't change cwd, so
  // the contextPath-driven refresh in useSourceControl never fires for it.
  // Re-check status on the prompt-returns transition to keep the branch
  // indicator honest without polling.
  const terminalLeafId = activeTab?.kind === "terminal" ? activeLeafId : null;
  const blockController = useBlockController(terminalLeafId);
  const blockMode = blockController?.blockMode ?? "prompt";
  const prevBlockRef = useRef({ leafId: terminalLeafId, mode: blockMode });
  const sourceControlRefresh = sourceControl.refresh;
  useEffect(() => {
    const prev = prevBlockRef.current;
    if (
      prev.leafId === terminalLeafId &&
      prev.mode !== "prompt" &&
      blockMode === "prompt"
    ) {
      void sourceControlRefresh({ remote: "never" });
    }
    prevBlockRef.current = { leafId: terminalLeafId, mode: blockMode };
  }, [terminalLeafId, blockMode, sourceControlRefresh]);

  // 编辑器保存(fs:file-written)与被 watch 目录变更(fs:changed)后防抖刷新，
  // 使 Source Control 面板的变更列表与磁盘保持同步。
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshCapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFsRefreshAtRef = useRef(0);
  const runFsRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = null;
    if (refreshCapTimerRef.current) clearTimeout(refreshCapTimerRef.current);
    refreshCapTimerRef.current = null;
    lastFsRefreshAtRef.current = Date.now();
    void sourceControlRefresh();
  }, [sourceControlRefresh]);
  const scheduleRefresh = useCallback(() => {
    // 突发的首个触发起挂上限定时器，连续变更时 400ms trailing 防抖会被不断
    // 重置，上限保证刷新仍会落地。
    if (
      refreshTimerRef.current === null &&
      refreshCapTimerRef.current === null
    ) {
      refreshCapTimerRef.current = setTimeout(
        runFsRefresh,
        FS_REFRESH_MAX_WAIT_MS,
      );
    }
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      const elapsed = Date.now() - lastFsRefreshAtRef.current;
      if (elapsed < FS_REFRESH_MIN_INTERVAL_MS) return;
      runFsRefresh();
    }, FS_REFRESH_DEBOUNCE_MS);
  }, [runFsRefresh]);
  useEffect(() => {
    const un1 = getCurrentWebviewWindow().listen(
      "fs:file-written",
      scheduleRefresh,
    );
    const un2 = listenFsChanged(scheduleRefresh);
    return () => {
      void un1.then((un) => un());
      void un2.then((un) => un());
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      if (refreshCapTimerRef.current) clearTimeout(refreshCapTimerRef.current);
    };
  }, [scheduleRefresh]);

  const toggleSourceControl = useCallback(() => {
    cycleSidebarView("source-control");
  }, [cycleSidebarView]);

  const openGitGraphFromContext = useCallback(async () => {
    const known = sourceControl.hasRepo ? sourceControl.repo : null;
    const fixedTargetIsLoaded =
      sidebarView !== "source-control" ||
      repositoryTarget.mode !== "fixed" ||
      known?.repoRoot === repositoryTarget.repoRoot;
    if (known && fixedTargetIsLoaded) {
      openCommitHistoryTab({
        repoRoot: known.repoRoot,
        branch: sourceControl.status?.branch ?? null,
      });
      return;
    }
    if (!graphContextPath) return;
    try {
      const repo = await native.gitResolveRepo(graphContextPath);
      if (!repo) return;
      openCommitHistoryTab({ repoRoot: repo.repoRoot, branch: repo.branch });
    } catch {
      /* noop */
    }
  }, [
    openCommitHistoryTab,
    sourceControl.hasRepo,
    sourceControl.repo,
    sourceControl.status?.branch,
    graphContextPath,
    repositoryTarget,
    sidebarView,
  ]);

  return { sourceControl, toggleSourceControl, openGitGraphFromContext };
}
