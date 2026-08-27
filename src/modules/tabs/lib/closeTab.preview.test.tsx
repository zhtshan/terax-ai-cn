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
    let previewId: number | null = null;
    act(() => {
      previewId = result.current.newPreviewTab("http://localhost:3000");
    });
    expect(previewId).not.toBeNull();

    // Before fix: closeTab returns null for the only preview tab, keeping it.
    // After fix: preview tabs can be closed even when sole tab in space.
    act(() => {
      result.current.closeTab(previewId!);
    });

    // Tab should be gone after close.
    expect(result.current.tabs.some((t) => t.id === previewId)).toBe(false);
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
