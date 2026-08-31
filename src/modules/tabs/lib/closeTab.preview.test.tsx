/// <reference types="vitest/globals" />
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/terminal/lib/useTerminalSession", () => ({
  disposeSession: vi.fn(),
}));

import { useTabs } from "./useTabs";

describe("closeTab with preview tab as sole tab in space", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows closing the only preview tab (issue #659)", () => {
    const { result } = renderHook(() => useTabs());
    act(() => {
      // The initial terminal owns the default space; give the preview its
      // own space so it is really the sole tab there.
      result.current.setActiveSpaceForNewTabs("s2");
      result.current.newPreviewTab("http://localhost:3000");
    });
    const previewId = result.current.tabs.find(
      (t) => t.kind === "preview",
    )!.id;

    // Before fix: closeTab refuses because the preview is the only tab of
    // its space. After fix: preview tabs can close even when sole in space.
    act(() => {
      result.current.closeTab(previewId);
    });

    // Tab should be gone after close, active moved to a surviving tab.
    expect(result.current.tabs.some((t) => t.id === previewId)).toBe(false);
    expect(result.current.tabs).toHaveLength(1);
    expect(result.current.activeId).toBe(1);
  });

  it("still refuses to close the last terminal tab in a space", () => {
    // useTabs starts with one terminal tab (id=1); closing it should be
    // refused so the app always has at least one tab open.
    const { result } = renderHook(() => useTabs());
    const beforeCount = result.current.tabs.length;
    expect(beforeCount).toBe(1);

    act(() => {
      result.current.closeTab(1);
    });
    // Guard still holds: last terminal tab cannot close.
    expect(result.current.tabs).toHaveLength(beforeCount);
  });
});
