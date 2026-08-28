import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Tab } from "./useTabs";

type Result = {
  explorerRoot: string | null;
  inheritedCwdForNewTab: () => string | undefined;
};

export function useWorkspaceCwd(
  activeTab: Tab | undefined,
  tabs: Tab[],
  home: string | null,
  spaceId: string | null,
): Result {
  const lastTerminalCwd = useRef<string | null>(null);
  const lastSpaceId = useRef<string | null>(null);

  // Reset the cwd memory on a space switch so the previous space's cwd never
  // leaks into the new space's explorer root or new-tab inheritance.
  if (lastSpaceId.current !== spaceId) {
    lastSpaceId.current = spaceId;
    lastTerminalCwd.current = null;
  }

  useEffect(() => {
    if (
      activeTab?.kind === "terminal" &&
      activeTab.cwd &&
      (spaceId === null || activeTab.spaceId === spaceId)
    ) {
      lastTerminalCwd.current = activeTab.cwd;
    }
  }, [activeTab, spaceId]);

  const explorerRoot = useMemo<string | null>(() => {
    if (activeTab?.kind === "terminal" && activeTab.cwd) return activeTab.cwd;
    if (lastTerminalCwd.current) return lastTerminalCwd.current;
    const anyTerm = tabs.find(
      (t) =>
        t.kind === "terminal" &&
        t.cwd &&
        (spaceId === null || t.spaceId === spaceId),
    );
    if (anyTerm?.kind === "terminal" && anyTerm.cwd) return anyTerm.cwd;
    return home;
  }, [activeTab, tabs, home, spaceId]);

  const inheritedCwdForNewTab = useCallback((): string | undefined => {
    if (activeTab?.kind === "terminal" && activeTab.cwd) return activeTab.cwd;
    // Editor tabs inherit the last terminal's cwd (or workspace home), not
    // the file's folder — opening a new terminal from a file shouldn't
    // hijack the user's working directory context.
    return lastTerminalCwd.current ?? home ?? undefined;
  }, [activeTab, home]);

  return { explorerRoot, inheritedCwdForNewTab };
}
