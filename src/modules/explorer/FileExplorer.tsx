import { forwardRef, memo, useImperativeHandle, useRef } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { GitStatusSnapshot } from "@/modules/ai/lib/native";
import type { TerminalPathDropTarget } from "@/modules/terminal";
import { FileTreeSection, type FileTreeSectionHandle } from "./FileTreeSection";
import { OutlineSection } from "./OutlineSection";
import { TimelineSection } from "./TimelineSection";
import { useSectionCollapse } from "./lib/useSectionCollapse";

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
  pathDropTarget?: TerminalPathDropTarget;
  gitStatus?: GitStatusSnapshot | null;
};

export const FileExplorer = memo(
  forwardRef<FileExplorerHandle, Props>(function FileExplorer(props, ref) {
    const treeRef = useRef<FileTreeSectionHandle>(null);
    const fileTree = useSectionCollapse("file-tree", false);
    const outline = useSectionCollapse("outline", true);
    const timeline = useSectionCollapse("timeline", true);

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
      >
        <ResizablePanel
          panelRef={fileTree.panelRef}
          minSize={32}
          collapsedSize={32}
          collapsible
          onResize={fileTree.onResize}
        >
          <FileTreeSection
            ref={treeRef}
            collapsed={fileTree.collapsed}
            onToggle={fileTree.toggle}
            onResize={fileTree.onResize}
            {...props}
          />
        </ResizablePanel>
        <ResizableHandle className="group/handle relative w-full py-0.5">
          <div className="mx-auto h-px w-full bg-border transition-colors group-data-[resizing]/handle:bg-primary" />
        </ResizableHandle>
        <ResizablePanel
          panelRef={outline.panelRef}
          defaultSize={32}
          minSize={32}
          collapsedSize={32}
          collapsible
          onResize={outline.onResize}
        >
          <OutlineSection
            collapsed={outline.collapsed}
            onToggle={outline.toggle}
          />
        </ResizablePanel>
        <ResizableHandle className="group/handle relative w-full py-0.5">
          <div className="mx-auto h-px w-full bg-border transition-colors group-data-[resizing]/handle:bg-primary" />
        </ResizableHandle>
        <ResizablePanel
          panelRef={timeline.panelRef}
          defaultSize={32}
          minSize={32}
          collapsedSize={32}
          collapsible
          onResize={timeline.onResize}
        >
          <TimelineSection
            collapsed={timeline.collapsed}
            onToggle={timeline.toggle}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }),
);
