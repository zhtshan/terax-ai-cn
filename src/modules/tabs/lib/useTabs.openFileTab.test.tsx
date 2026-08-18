/// <reference types="vitest/globals" />
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// useTabs pulls disposeSession from useTerminalSession, whose module
// registers a Tauri event listener on import (unavailable under happy-dom).
vi.mock("@/modules/terminal/lib/useTerminalSession", () => ({
  disposeSession: vi.fn(),
}));

import { useTabs } from "./useTabs";

describe("openFileTab / openAiDiffTab / newMarkdownTab sync return", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("openFileTab returns a usable id synchronously", () => {
    const { result } = renderHook(() => useTabs());
    let id: number | null = null;
    act(() => {
      id = result.current.openFileTab("/repo/src/a.ts", true);
    });
    expect(id).not.toBeNull();
    expect(result.current.activeId).toBe(id);
    expect(
      result.current.tabs.some(
        (t) => t.kind === "editor" && t.path === "/repo/src/a.ts",
      ),
    ).toBe(true);
  });

  it("openFileTab keeps returning a valid id on rapid re-opens", () => {
    const { result } = renderHook(() => useTabs());
    const ids: number[] = [];
    act(() => {
      // Same batch: the second call must still resolve a live tab id even
      // though tabsRef predates the first update.
      ids.push(result.current.openFileTab("/repo/src/a.ts", true)!);
      ids.push(result.current.openFileTab("/repo/src/a.ts", true)!);
    });
    for (const id of ids) {
      expect(result.current.tabs.some((t) => t.id === id)).toBe(true);
    }
    expect(result.current.activeId).toBe(ids[ids.length - 1]);
    expect(
      result.current.tabs.filter((t) => t.kind === "editor").length,
    ).toBe(1);
  });

  it("openAiDiffTab returns a usable id synchronously", () => {
    const { result } = renderHook(() => useTabs());
    let id: number | null = null;
    act(() => {
      id = result.current.openAiDiffTab({
        path: "/repo/src/b.ts",
        originalContent: "",
        proposedContent: "x",
        approvalId: "ap1",
        isNewFile: false,
      });
    });
    expect(id).not.toBeNull();
    expect(result.current.activeId).toBe(id);
  });

  it("newMarkdownTab returns a usable id synchronously", () => {
    const { result } = renderHook(() => useTabs());
    let id: number | null = null;
    act(() => {
      id = result.current.newMarkdownTab("/repo/README.md");
    });
    expect(id).not.toBeNull();
    expect(result.current.activeId).toBe(id);
  });
});
