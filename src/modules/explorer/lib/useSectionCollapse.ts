import { useCallback, useState } from "react";
import { usePanelRef } from "react-resizable-panels";

export type UseSectionCollapseReturn = {
  panelRef: ReturnType<typeof usePanelRef>;
  collapsed: boolean;
  onResize: () => void;
  toggle: () => void;
};

export function useSectionCollapse(): UseSectionCollapseReturn {
  const panelRef = usePanelRef();
  const [collapsed, setCollapsed] = useState(false);

  const onResize = useCallback(() => {
    setCollapsed(panelRef.current?.isCollapsed() ?? false);
  }, [panelRef]);

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
