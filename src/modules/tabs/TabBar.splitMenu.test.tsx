import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TabBar } from "./TabBar";
import { MAX_PANES_PER_TAB, type TerminalTab } from "./lib/useTabs";
import { leafIds } from "@/modules/terminal";

let nextPaneId = 100;

function paneTreeWithLeaves(count: number): TerminalTab["paneTree"] {
  let tree: TerminalTab["paneTree"] = { kind: "leaf", id: nextPaneId++ };
  while (leafIds(tree).length < count) {
    tree = {
      kind: "split",
      id: nextPaneId++,
      dir: "row",
      children: [tree, { kind: "leaf", id: nextPaneId++ }],
    };
  }
  return tree;
}

function terminalTab(paneCount = 1): TerminalTab {
  const paneTree = paneTreeWithLeaves(paneCount);
  return {
    id: 1,
    kind: "terminal",
    spaceId: "default",
    title: "zsh",
    cwd: "/w",
    paneTree,
    activeLeafId: leafIds(paneTree)[0],
  };
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
  onPin: vi.fn(),
  onTogglePin: vi.fn(),
  onRename: vi.fn(),
  onReorder: vi.fn(),
  onSplitPane: vi.fn(),
};

async function openTerminalContextMenu(tab: TerminalTab) {
  render(<TabBar {...baseProps} tabs={[tab]} />);
  const tabEl = document.querySelector<HTMLElement>('[data-tab-id="1"]');
  if (!tabEl) throw new Error("terminal tab not found");
  fireEvent.contextMenu(tabEl);
  return waitFor(() => screen.getByRole("menuitem", { name: "向右分屏" }));
}

describe("TabBar 终端右键分屏菜单", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("右键终端 tab 显示向右/向下分屏菜单项", async () => {
    await openTerminalContextMenu(terminalTab());
    expect(screen.getByRole("menuitem", { name: "向右分屏" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "向下分屏" })).toBeTruthy();
  });

  it("点击向右分屏回调 dir=row", async () => {
    await openTerminalContextMenu(terminalTab());
    fireEvent.click(screen.getByRole("menuitem", { name: "向右分屏" }));
    expect(baseProps.onSplitPane).toHaveBeenCalledWith(1, "row");
  });

  it("点击向下分屏回调 dir=col", async () => {
    await openTerminalContextMenu(terminalTab());
    fireEvent.click(screen.getByRole("menuitem", { name: "向下分屏" }));
    expect(baseProps.onSplitPane).toHaveBeenCalledWith(1, "col");
  });

  it("pane 数达上限时菜单项禁用", async () => {
    await openTerminalContextMenu(terminalTab(MAX_PANES_PER_TAB));
    expect(
      screen
        .getByRole("menuitem", { name: "向右分屏" })
        .hasAttribute("data-disabled"),
    ).toBe(true);
    expect(
      screen
        .getByRole("menuitem", { name: "向下分屏" })
        .hasAttribute("data-disabled"),
    ).toBe(true);
  });
});
