import type { OutlineItem } from "@/modules/editor";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OutlineSection } from "./OutlineSection";

afterEach(cleanup);

const items: OutlineItem[] = [
  { level: 1, text: "logger", line: 1, kind: 13 },
  { level: 1, text: "_format_length", line: 3, kind: 12 },
  { level: 2, text: "value", line: 4, kind: 13 },
  { level: 2, text: "pt", line: 5, kind: 13 },
  { level: 1, text: "_extract_paragraph_format", line: 7, kind: 12 },
  { level: 2, text: "para", line: 8, kind: 13 },
];

describe("OutlineSection", () => {
  it("renders functions with nested variables indented beneath them", () => {
    render(
      <OutlineSection
        collapsed={false}
        onToggle={() => {}}
        items={items}
        activeLine={null}
        onJump={() => {}}
      />,
    );

    expect(screen.getByText("logger")).toBeTruthy();
    expect(screen.getByText("_format_length")).toBeTruthy();
    expect(screen.getByText("value")).toBeTruthy();
    expect(screen.getByText("pt")).toBeTruthy();
  });

  it("collapses a function's children when its chevron is clicked", () => {
    render(
      <OutlineSection
        collapsed={false}
        onToggle={() => {}}
        items={items}
        activeLine={null}
        onJump={() => {}}
      />,
    );

    const row = screen.getByText("_format_length").closest("div");
    if (!row) throw new Error("row not found");
    const chevron = row.querySelector("button");
    if (!chevron) throw new Error("chevron button not found");
    fireEvent.click(chevron);

    expect(screen.queryByText("value")).toBeNull();
    expect(screen.queryByText("pt")).toBeNull();
    // Sibling function's children remain visible.
    expect(screen.getByText("para")).toBeTruthy();
  });

  it("expand-all/collapse-all toggle button hides and restores all nested items", () => {
    render(
      <OutlineSection
        collapsed={false}
        onToggle={() => {}}
        items={items}
        activeLine={null}
        onJump={() => {}}
      />,
    );

    const toggleAllButton = screen.getByTitle("全部折叠");
    fireEvent.click(toggleAllButton);

    expect(screen.queryByText("value")).toBeNull();
    expect(screen.queryByText("para")).toBeNull();

    fireEvent.click(screen.getByTitle("全部展开"));

    expect(screen.getByText("value")).toBeTruthy();
    expect(screen.getByText("para")).toBeTruthy();
  });

  it("omits the expand-all control when no symbol has children", () => {
    render(
      <OutlineSection
        collapsed={false}
        onToggle={() => {}}
        items={[
          { level: 1, text: "alpha", line: 1, kind: 12 },
          { level: 1, text: "beta", line: 5, kind: 12 },
        ]}
        activeLine={null}
        onJump={() => {}}
      />,
    );

    expect(screen.getByText("alpha")).toBeTruthy();
    expect(screen.queryByTitle("全部折叠")).toBeNull();
    expect(screen.queryByTitle("全部展开")).toBeNull();
  });

  it("jumps to a symbol's line when its label is clicked", () => {
    const onJump = vi.fn();
    render(
      <OutlineSection
        collapsed={false}
        onToggle={() => {}}
        items={items}
        activeLine={null}
        onJump={onJump}
      />,
    );

    fireEvent.click(screen.getByText("value"));
    expect(onJump).toHaveBeenCalledWith(4);
  });

  it("shows a loading state instead of the empty-outline message while fetching", () => {
    render(
      <OutlineSection
        collapsed={false}
        onToggle={() => {}}
        items={null}
        loading={true}
        activeLine={null}
        onJump={() => {}}
      />,
    );

    expect(screen.getByText("正在加载大纲…")).toBeTruthy();
    expect(screen.queryByText("此文件没有可显示的大纲项")).toBeNull();
  });
});
