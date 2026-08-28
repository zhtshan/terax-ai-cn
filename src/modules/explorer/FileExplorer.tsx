import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { GitStatusSnapshot } from "@/modules/ai/lib/native";
import type { OutlineItem, OutlineUnavailableReason } from "@/modules/editor";
import type { TerminalPathDropTarget } from "@/modules/terminal";
import {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useRef,
  type RefObject,
} from "react";
import {
  useDefaultLayout,
  useGroupRef,
  type PanelImperativeHandle,
} from "react-resizable-panels";
import { FileTreeSection, type FileTreeSectionHandle } from "./FileTreeSection";
import { useSectionCollapse } from "./lib/useSectionCollapse";
import { OutlineSection } from "./OutlineSection";
import { TimelineSection } from "./TimelineSection";
import { useTimelinePath } from "./lib/useTimelinePath";

export type FileExplorerHandle = {
  focus: () => void;
  isFocused: () => boolean;
  focusSearch: () => void;
};

type Props = {
  rootPath: string | null;
  activeFilePath?: string | null;
  onOpenFile: (path: string, pin?: boolean) => void;
  onPathRenamed?: (from: string, to: string) => void;
  onPathDeleted?: (path: string) => void;
  onRevealInTerminal?: (path: string) => void;
  onAttachToAgent?: (path: string) => void;
  onNavigate?: (path: string) => void;
  pathDropTarget?: TerminalPathDropTarget;
  gitStatus?: GitStatusSnapshot | null;
  outlineItems?: OutlineItem[] | null;
  outlineUnavailableReason?: OutlineUnavailableReason | null;
  outlineLoading?: boolean;
  activeHeadingLine?: number | null;
  onJumpToHeading?: (line: number) => void;
  onOpenCommitFile?: (input: {
    repoRoot: string;
    sha: string;
    shortSha: string;
    subject: string;
    path: string;
    originalPath: string | null;
    compareTo?: "parent" | "working";
  }) => void;
};

type PanelId = "file-tree" | "outline" | "timeline";

// Outline/timeline's `defaultSize` and their first-ever expand target.
const SECTION_DEFAULT_PCT = 15;

// Mirrors each panel's own `minSize` prop below: the floor a panel can be
// squeezed to as a donor without being pushed into a collapsed state.
const FLOOR_PCT: Record<PanelId, number> = {
  "file-tree": 15,
  outline: 8,
  timeline: 8,
};

// Below every panel's own collapsedSize; the group's clamp snaps whichever
// panel we target directly to its real collapsed percentage.
const COLLAPSE_HINT = 0;

// Caps every donor at its own floor, so toggling one section can never force
// a sibling into a collapsed state as a side effect.
function shiftLayout(
  layout: Record<string, number>,
  id: PanelId,
  target: number,
  donors: readonly PanelId[],
): Record<string, number> {
  const wanted = target - layout[id];
  const next = { ...layout, [id]: target };
  if (wanted > 0) {
    const givers = donors
      .map((d) => ({ id: d, avail: Math.max(layout[d] - FLOOR_PCT[d], 0) }))
      .filter((d) => d.avail > 0);
    const totalAvail = givers.reduce((sum, d) => sum + d.avail, 0);
    const take = Math.min(wanted, totalAvail);
    next[id] = layout[id] + take;
    for (const g of givers) next[g.id] = layout[g.id] - take * (g.avail / totalAvail);
  } else if (wanted < 0) {
    const give = -wanted;
    const totalCurrent = donors.reduce((sum, d) => sum + layout[d], 0);
    for (const d of donors) {
      const share = totalCurrent > 0 ? layout[d] / totalCurrent : 1 / donors.length;
      next[d] = layout[d] + give * share;
    }
  }
  return next;
}

export const FileExplorer = memo(
  forwardRef<FileExplorerHandle, Props>(function FileExplorer(props, ref) {
    const treeRef = useRef<FileTreeSectionHandle>(null);
    const fileTree = useSectionCollapse("file-tree", false);
    const outline = useSectionCollapse("outline", true);
    const timeline = useSectionCollapse("timeline", true);
    const groupRef = useGroupRef();
    const [timelineFilePath, setTimelineFilePath] = useTimelinePath();

    // Restores each panel's pre-collapse size on re-expand, instead of always
    // snapping back to a fixed default.
    const lastExpandedRef = useRef<Record<PanelId, number>>({
      "file-tree": 100 - SECTION_DEFAULT_PCT * 2,
      outline: SECTION_DEFAULT_PCT,
      timeline: SECTION_DEFAULT_PCT,
    });

    const toggleSection = useCallback(
      (
        id: PanelId,
        panelRef: RefObject<PanelImperativeHandle | null>,
        donors: readonly PanelId[],
      ) => {
        const group = groupRef.current;
        const panel = panelRef.current;
        if (!group || !panel) return;
        const layout = group.getLayout();
        const collapsing = !panel.isCollapsed();
        if (collapsing) lastExpandedRef.current[id] = layout[id];
        const target = collapsing ? COLLAPSE_HINT : lastExpandedRef.current[id];
        group.setLayout(shiftLayout(layout, id, target, donors));
      },
      [groupRef],
    );

    const toggleFileTree = useCallback(
      () => toggleSection("file-tree", fileTree.panelRef, ["outline", "timeline"]),
      [toggleSection, fileTree.panelRef],
    );
    const toggleOutline = useCallback(
      () => toggleSection("outline", outline.panelRef, ["file-tree"]),
      [toggleSection, outline.panelRef],
    );
    const toggleTimeline = useCallback(
      () => toggleSection("timeline", timeline.panelRef, ["file-tree"]),
      [toggleSection, timeline.panelRef],
    );
    const handleOpenTimeline = useCallback(
      (path: string) => {
        setTimelineFilePath(path);
        const group = groupRef.current;
        const panel = timeline.panelRef.current;
        if (group && panel && panel.isCollapsed()) {
          toggleSection("timeline", timeline.panelRef, ["file-tree"]);
        }
      },
      [groupRef, timeline.panelRef, toggleSection],
    );

    // 显式面板 id 让布局持久化键跨会话稳定（自动 id 基于 useId，会随组件树变化失效）
    const { defaultLayout, onLayoutChanged } = useDefaultLayout({
      id: "explorer-sections",
      panelIds: ["file-tree", "outline", "timeline"],
      storage: window.localStorage,
    });

    useImperativeHandle(ref, () => ({
      focus: () => treeRef.current?.focus(),
      isFocused: () => treeRef.current?.isFocused() ?? false,
      focusSearch: () => treeRef.current?.focusSearch(),
    }));

    return (
      <ResizablePanelGroup
        orientation="vertical"
        id="explorer-sections"
        className="h-full"
        groupRef={groupRef}
        defaultLayout={defaultLayout}
        onLayoutChanged={onLayoutChanged}
      >
        <ResizablePanel
          id="file-tree"
          panelRef={fileTree.panelRef}
          minSize={String(FLOOR_PCT["file-tree"])}
          collapsedSize={32}
          collapsible
          onResize={fileTree.onResize}
        >
          <FileTreeSection
            ref={treeRef}
            collapsed={fileTree.collapsed}
            onToggle={toggleFileTree}
            onOpenTimeline={handleOpenTimeline}
            {...props}
          />
        </ResizablePanel>
        <ResizableHandle className="group/handle relative w-full py-0.5">
          <div className="mx-auto h-px w-full bg-border transition-colors group-data-[resizing]/handle:bg-primary" />
        </ResizableHandle>
        <ResizablePanel
          id="outline"
          panelRef={outline.panelRef}
          defaultSize={String(SECTION_DEFAULT_PCT)}
          minSize={String(FLOOR_PCT.outline)}
          collapsedSize={32}
          collapsible
          onResize={outline.onResize}
        >
          <OutlineSection
            collapsed={outline.collapsed}
            onToggle={toggleOutline}
            items={props.outlineItems ?? null}
            unavailableReason={props.outlineUnavailableReason ?? null}
            loading={props.outlineLoading ?? false}
            activeLine={props.activeHeadingLine ?? null}
            onJump={props.onJumpToHeading ?? (() => {})}
          />
        </ResizablePanel>
        <ResizableHandle className="group/handle relative w-full py-0.5">
          <div className="mx-auto h-px w-full bg-border transition-colors group-data-[resizing]/handle:bg-primary" />
        </ResizableHandle>
        <ResizablePanel
          id="timeline"
          panelRef={timeline.panelRef}
          defaultSize={String(SECTION_DEFAULT_PCT)}
          minSize={String(FLOOR_PCT.timeline)}
          collapsedSize={32}
          collapsible
          onResize={timeline.onResize}
        >
          <TimelineSection
            collapsed={timeline.collapsed}
            onToggle={toggleTimeline}
            activeFilePath={props.activeFilePath}
            timelineFilePath={timelineFilePath}
            repoRoot={props.gitStatus?.repoRoot ?? null}
            onOpenCommitFile={props.onOpenCommitFile ?? (() => {})}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }),
);
