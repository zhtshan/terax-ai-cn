import { useCallback, useState } from "react";
import { leafHasForegroundProcess, leafIds } from "@/modules/terminal";
import { nextActiveInSpace, type Tab } from "@/modules/tabs";

type Params = {
  tabs: Tab[];
  disposeTab: (id: number) => void;
  closePane: (leafId: number) => void;
};

/**
 * Guards tab closing: dirty editors and terminals with a live foreground
 * process route through a confirmation dialog instead of closing immediately.
 * Owns the pending-close states the dialogs render from.
 */
export function useTabCloseGuards({ tabs, disposeTab, closePane }: Params) {
  const [pendingCloseTab, setPendingCloseTab] = useState<number | null>(null);
  const [pendingTerminalCloseTab, setPendingTerminalCloseTab] = useState<
    number | null
  >(null);
  const [pendingClosePaneLeaf, setPendingClosePaneLeaf] = useState<
    number | null
  >(null);
  const [pendingDeleteTabs, setPendingDeleteTabs] = useState<number[] | null>(
    null,
  );

  const handleClose = useCallback(
    async (id: number) => {
      // Last tab in its space can't be closed (closeTab refuses). Skip the
      // dialog entirely so confirming it doesn't appear to silently fail.
      if (nextActiveInSpace(tabs, id) === null) return;
      const t = tabs.find((x) => x.id === id);
      if (t?.kind === "editor" && t.dirty) {
        setPendingCloseTab(id);
        return;
      }
      if (t?.kind === "terminal") {
        const leaves = leafIds(t.paneTree);
        const checks = await Promise.all(leaves.map(leafHasForegroundProcess));
        if (checks.some(Boolean)) {
          setPendingTerminalCloseTab(id);
          return;
        }
      }
      disposeTab(id);
    },
    [tabs, disposeTab],
  );

  // Same guard as handleClose, scoped to a single pane: the pane close button
  // must not kill a live foreground process without asking.
  const handleClosePane = useCallback(
    async (leafId: number) => {
      if (await leafHasForegroundProcess(leafId)) {
        setPendingClosePaneLeaf(leafId);
        return;
      }
      closePane(leafId);
    },
    [closePane],
  );

  const confirmClose = useCallback(() => {
    if (pendingCloseTab !== null) {
      disposeTab(pendingCloseTab);
      setPendingCloseTab(null);
    }
  }, [pendingCloseTab, disposeTab]);

  const cancelClose = useCallback(() => {
    setPendingCloseTab(null);
  }, []);

  const confirmTerminalClose = useCallback(() => {
    if (pendingTerminalCloseTab !== null) disposeTab(pendingTerminalCloseTab);
    if (pendingClosePaneLeaf !== null) closePane(pendingClosePaneLeaf);
    setPendingTerminalCloseTab(null);
    setPendingClosePaneLeaf(null);
  }, [pendingTerminalCloseTab, pendingClosePaneLeaf, disposeTab, closePane]);

  const cancelTerminalClose = useCallback(() => {
    setPendingTerminalCloseTab(null);
    setPendingClosePaneLeaf(null);
  }, []);

  const confirmDeleteClose = useCallback(() => {
    if (pendingDeleteTabs !== null) {
      for (const id of pendingDeleteTabs) disposeTab(id);
      setPendingDeleteTabs(null);
    }
  }, [pendingDeleteTabs, disposeTab]);

  const cancelDeleteClose = useCallback(() => {
    setPendingDeleteTabs(null);
  }, []);

  const handlePathDeleted = useCallback(
    (path: string) => {
      const dirty: number[] = [];
      for (const t of tabs) {
        if (t.kind !== "editor") continue;
        if (t.path !== path && !t.path.startsWith(`${path}/`)) continue;
        if (t.dirty) {
          dirty.push(t.id);
        } else {
          disposeTab(t.id);
        }
      }
      if (dirty.length > 0) setPendingDeleteTabs(dirty);
    },
    [tabs, disposeTab],
  );

  return {
    pendingCloseTab,
    pendingTerminalCloseTab,
    pendingClosePaneLeaf,
    pendingDeleteTabs,
    handleClose,
    handleClosePane,
    confirmClose,
    cancelClose,
    confirmTerminalClose,
    cancelTerminalClose,
    confirmDeleteClose,
    cancelDeleteClose,
    handlePathDeleted,
  };
}
