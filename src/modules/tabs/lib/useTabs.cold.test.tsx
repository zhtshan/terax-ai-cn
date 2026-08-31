/// <reference types="vitest/globals" />
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTabs } from "./useTabs";

type Hooks = ReturnType<typeof useTabs>;

const creators: [string, (h: Hooks) => number][] = [
  ["newTab", (h) => h.newTab()],
  ["newBlockTab", (h) => h.newBlockTab()],
  ["newAgentTab", (h) => h.newAgentTab("/tmp", "agent").tabId],
  ["newPrivateTab", (h) => h.newPrivateTab()],
];

describe("useTabs new-tab creators mark cold", () => {
  it.each(creators)("%s creates the tab cold before boot", (_name, create) => {
    const { result } = renderHook(() => useTabs());
    let id = -1;
    act(() => {
      id = create(result.current);
    });
    expect(result.current.tabs.find((t) => t.id === id)?.cold).toBe(true);
  });

  it("warms the active new tab once booted", () => {
    const { result } = renderHook(() => useTabs());
    let id = -1;
    act(() => {
      id = result.current.newTab();
    });
    act(() => {
      result.current.markBooted();
    });
    expect(result.current.tabs.find((t) => t.id === id)?.cold).toBe(false);
  });
});
