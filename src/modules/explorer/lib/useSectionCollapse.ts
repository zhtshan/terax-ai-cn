import { useCallback, useState } from "react";
import { usePanelRef } from "react-resizable-panels";

const STORAGE_KEY = "terax.explorer.sections.collapsed";

function getStoredCollapsed(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setStoredCollapsed(id: string, collapsed: boolean): void {
  const stored = getStoredCollapsed();
  stored[id] = collapsed;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

export type UseSectionCollapseReturn = {
  panelRef: ReturnType<typeof usePanelRef>;
  collapsed: boolean;
  onResize: () => void;
  toggle: () => void;
};

export function useSectionCollapse(
  sectionId: string,
  defaultCollapsed = false,
): UseSectionCollapseReturn {
  const panelRef = usePanelRef();
  const [collapsed, setCollapsed] = useState(() => {
    const stored = getStoredCollapsed();
    return stored[sectionId] ?? defaultCollapsed;
  });

  const onResize = useCallback(() => {
    const isCollapsed = panelRef.current?.isCollapsed() ?? false;
    setCollapsed(isCollapsed);
    setStoredCollapsed(sectionId, isCollapsed);
  }, [panelRef, sectionId]);

  const toggle = useCallback(() => {
    const p = panelRef.current;
    if (!p) return;
    if (p.isCollapsed()) {
      p.expand();
    } else {
      p.collapse();
    }
  }, [panelRef]);

  return { panelRef, collapsed, onResize, toggle };
}
