/// <reference types="vitest/globals" />
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TerminalPaneHandle } from "@/modules/terminal";
import type { Tab } from "@/modules/tabs";
import { useAiLiveBridge } from "./useAiLiveBridge";

type LiveLike = { readLeafBuffer: (leafId: number) => string | null };

function bootBridge(tabs: Tab[], buffers: Map<number, string>) {
  const setLive = vi.fn();
  const terminalRefs = {
    current: new Map<number, TerminalPaneHandle>(
      [...buffers].map(([id, buf]) => [
        id,
        { getBuffer: () => buf } as TerminalPaneHandle,
      ]),
    ),
  };
  renderHook(() =>
    useAiLiveBridge({
      setLive,
      activeId: tabs[0]?.id ?? 1,
      tabs,
      explorerRoot: null,
      launchCwd: null,
      home: null,
      openPreviewTab: () => {},
      newAgentTab: () => ({ tabId: 0, leafId: 0 }),
      terminalRefs,
    }),
  );
  return setLive.mock.calls[0][0] as LiveLike;
}

describe("useAiLiveBridge readLeafBuffer", () => {
  it("refuses buffer reads for leaves inside private terminal tabs", () => {
    const live = bootBridge(
      [
        {
          id: 1,
          kind: "terminal",
          spaceId: "s1",
          title: "private",
          paneTree: { kind: "leaf", id: 7, cwd: "/w" },
          activeLeafId: 7,
          private: true,
        },
        {
          id: 2,
          kind: "terminal",
          spaceId: "s1",
          title: "shell",
          paneTree: { kind: "leaf", id: 8, cwd: "/w" },
          activeLeafId: 8,
        },
      ],
      new Map([
        [7, "private-buffer"],
        [8, "shared-buffer"],
      ]),
    );
    expect(live.readLeafBuffer(7)).toBeNull();
  });

  it("still returns buffers for leaves in non-private tabs", () => {
    const live = bootBridge(
      [
        {
          id: 2,
          kind: "terminal",
          spaceId: "s1",
          title: "shell",
          paneTree: { kind: "leaf", id: 8, cwd: "/w" },
          activeLeafId: 8,
        },
      ],
      new Map([[8, "shared-buffer"]]),
    );
    expect(live.readLeafBuffer(8)).toContain("shared-buffer");
  });
});
