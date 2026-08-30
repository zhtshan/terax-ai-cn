/// <reference types="vitest/globals" />
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/terminal/lib/useTerminalSession", () => ({
  disposeSession: vi.fn(),
}));

import { disposeSession } from "@/modules/terminal/lib/useTerminalSession";
import { DEFAULT_SPACE_ID, useTabs } from "./useTabs";

// React runs setTabs updaters lazily once a fiber has a pending update, so a
// close planned inside the updater must not gate its disposeSession calls on
// variables assigned there. Each test parks a pending update (setLeafCwd) in
// the same batch as the close, which defers the updater and used to swallow
// the dispose entirely.

describe("useTabs close dispose under deferred updaters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("closeTab disposes terminal leaves even when the updater is deferred", () => {
    const { result } = renderHook(() => useTabs());
    act(() => {
      result.current.newTab();
    });
    act(() => {
      result.current.setLeafCwd(2, "/tmp/x");
      result.current.closeTab(1);
    });
    expect(disposeSession).toHaveBeenCalledWith(2);
  });

  it("removeTabsForSpace disposes leaves even when the updater is deferred", () => {
    const { result } = renderHook(() => useTabs());
    act(() => {
      result.current.newTabInSpace("s2");
    });
    act(() => {
      result.current.setLeafCwd(2, "/tmp/x");
      result.current.removeTabsForSpace("s2", DEFAULT_SPACE_ID);
    });
    expect(disposeSession).toHaveBeenCalledWith(4);
  });

  it("closePaneByLeaf disposes the leaf even when the updater is deferred", () => {
    const { result } = renderHook(() => useTabs());
    act(() => {
      result.current.newTab();
    });
    act(() => {
      result.current.setLeafCwd(2, "/tmp/x");
      result.current.closePaneByLeaf(2);
    });
    expect(disposeSession).toHaveBeenCalledWith(2);
  });
});
