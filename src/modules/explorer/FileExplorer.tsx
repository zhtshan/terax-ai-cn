import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { GitStatusSnapshot } from "@/modules/ai/lib/native";
import type { OutlineItem, OutlineUnavailableReason } from "@/modules/editor";
import type { TerminalPathDropTarget } from "@/modules/terminal";
import { forwardRef, memo, useImperativeHandle, useRef } from "react";
import { useDefaultLayout } from "react-resizable-panels";
import { FileTreeSection, type FileTreeSectionHandle } from "./FileTreeSection";
import { useSectionCollapse } from "./lib/useSectionCollapse";
import { OutlineSection } from "./OutlineSection";
import { TimelineSection } from "./TimelineSection";

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
  }) => void;
};

export const FileExplorer = memo(
  forwardRef<FileExplorerHandle, Props>(function FileExplorer(props, ref) {
    const treeRef = useRef<FileTreeSectionHandle>(null);
    const fileTree = useSectionCollapse("file-tree", false);
    const outline = useSectionCollapse("outline", true);
    const timeline = useSectionCollapse("timeline", true);

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
        defaultLayout={defaultLayout}
        onLayoutChanged={onLayoutChanged}
      >
        <ResizablePanel
          id="file-tree"
          panelRef={fileTree.panelRef}
          minSize={15}
          collapsedSize={32}
          collapsible
          onResize={fileTree.onResize}
        >
          <FileTreeSection
            ref={treeRef}
            collapsed={fileTree.collapsed}
            onToggle={fileTree.toggle}
            {...props}
          />
        </ResizablePanel>
        <ResizableHandle className="group/handle relative w-full py-0.5">
          <div className="mx-auto h-px w-full bg-border transition-colors group-data-[resizing]/handle:bg-primary" />
        </ResizableHandle>
        <ResizablePanel
          id="outline"
          panelRef={outline.panelRef}
          defaultSize="15"
          minSize={8}
          collapsedSize={32}
          collapsible
          onResize={outline.onResize}
        >
          <OutlineSection
            collapsed={outline.collapsed}
            onToggle={outline.toggle}
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
          defaultSize="15"
          minSize={8}
          collapsedSize={32}
          collapsible
          onResize={timeline.onResize}
        >
          <TimelineSection
            collapsed={timeline.collapsed}
            onToggle={timeline.toggle}
            activeFilePath={props.activeFilePath}
            repoRoot={props.gitStatus?.repoRoot ?? null}
            onOpenCommitFile={props.onOpenCommitFile ?? (() => {})}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }),
);
