import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TabBar } from "./TabBar";
import type { EditorTab } from "./lib/useTabs";

function editorTab(externalChange?: boolean): EditorTab {
  return {
    id: 2,
    kind: "editor",
    spaceId: "default",
    title: "a.ts",
    path: "/w/a.ts",
    dirty: false,
    preview: false,
    ...(externalChange !== undefined && { externalChange }),
  };
}

const baseProps = {
  activeId: 2,
  onSelect: vi.fn(),
  onNew: vi.fn(),
  onNewBlock: vi.fn(),
  onNewPrivate: vi.fn(),
  onNewPreview: vi.fn(),
  onNewEditor: vi.fn(),
  onNewGitGraph: vi.fn(),
  onClose: vi.fn(),
  onPin: vi.fn(),
  onRename: vi.fn(),
  onReorder: vi.fn(),
};

describe("TabBar 外部变更徽标", () => {
  afterEach(cleanup);

  it("externalChange 为 true 时渲染磁盘已修改徽标", () => {
    render(<TabBar {...baseProps} tabs={[editorTab(true)]} />);
    expect(screen.getByLabelText("磁盘已修改")).toBeTruthy();
  });

  it("无 externalChange 时不渲染徽标", () => {
    render(<TabBar {...baseProps} tabs={[editorTab()]} />);
    expect(screen.queryByLabelText("磁盘已修改")).toBeNull();
  });
});
