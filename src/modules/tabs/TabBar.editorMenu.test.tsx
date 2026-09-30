import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EditorTab } from "./lib/useTabs";
import { TabBar } from "./TabBar";

function editorTab(id: number): EditorTab {
  return {
    id,
    kind: "editor",
    spaceId: "default",
    title: `f${id}.ts`,
    path: `/w/f${id}.ts`,
    dirty: false,
    preview: false,
  } as EditorTab;
}

const baseProps = {
  activeId: 1,
  onSelect: vi.fn(),
  onNew: vi.fn(),
  onNewBlock: vi.fn(),
  onNewPrivate: vi.fn(),
  onNewPreview: vi.fn(),
  onNewEditor: vi.fn(),
  onNewGitGraph: vi.fn(),
  onClose: vi.fn(),
  onCloseTabsToRight: vi.fn(),
  onCloseOtherTabs: vi.fn(),
  onPin: vi.fn(),
  onTogglePin: vi.fn(),
  onRename: vi.fn(),
  onReorder: vi.fn(),
};

async function openEditorContextMenu(tabs: EditorTab[], id: number) {
  render(<TabBar {...baseProps} tabs={tabs} />);
  const tabEl = document.querySelector<HTMLElement>(`[data-tab-id="${id}"]`);
  if (!tabEl) throw new Error("editor tab not found");
  fireEvent.contextMenu(tabEl);
  return waitFor(() => screen.getByRole("menuitem", { name: "复制路径" }));
}

describe("TabBar 编辑器右键关闭菜单", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("关闭 / 关闭右侧 / 关闭其他回调对应 tab id", async () => {
    await openEditorContextMenu([editorTab(1), editorTab(2), editorTab(3)], 2);
    fireEvent.click(screen.getByRole("menuitem", { name: "关闭" }));
    expect(baseProps.onClose).toHaveBeenCalledWith(2);

    cleanup();
    await openEditorContextMenu([editorTab(1), editorTab(2), editorTab(3)], 2);
    fireEvent.click(screen.getByRole("menuitem", { name: "关闭右侧标签页" }));
    expect(baseProps.onCloseTabsToRight).toHaveBeenCalledWith(2);

    cleanup();
    await openEditorContextMenu([editorTab(1), editorTab(2), editorTab(3)], 2);
    fireEvent.click(screen.getByRole("menuitem", { name: "关闭其他标签页" }));
    expect(baseProps.onCloseOtherTabs).toHaveBeenCalledWith(2);
  });

  it("最右侧 tab 不显示关闭右侧", async () => {
    await openEditorContextMenu([editorTab(1), editorTab(2)], 2);
    expect(
      screen.queryByRole("menuitem", { name: "关闭右侧标签页" }),
    ).toBeNull();
    expect(
      screen.getByRole("menuitem", { name: "关闭其他标签页" }),
    ).toBeTruthy();
  });

  it("仅一个 tab 时不显示关闭项", async () => {
    await openEditorContextMenu([editorTab(1)], 1);
    expect(screen.queryByRole("menuitem", { name: "关闭" })).toBeNull();
  });
});
