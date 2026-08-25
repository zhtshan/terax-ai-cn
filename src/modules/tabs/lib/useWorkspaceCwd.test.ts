// @vitest-environment happy-dom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Tab } from "./useTabs";
import { useWorkspaceCwd } from "./useWorkspaceCwd";

function termTab(id: number, spaceId: string, cwd: string): Tab {
  return {
    id,
    kind: "terminal",
    spaceId,
    title: cwd.split("/").pop() ?? "shell",
    cwd,
    paneTree: { kind: "leaf", id },
    activeLeafId: id,
  };
}

function editorTab(id: number, spaceId: string, path: string): Tab {
  return {
    id,
    kind: "editor",
    spaceId,
    title: path.split("/").pop() ?? "file",
    path,
    dirty: false,
    preview: false,
  };
}

type Args = {
  active: Tab | undefined;
  all: Tab[];
  home: string | null;
  spaceId: string | null;
};

describe("useWorkspaceCwd", () => {
  it("active terminal tab wins regardless of space", () => {
    const tabs = [termTab(1, "s1", "/repo-a"), termTab(2, "s2", "/repo-b")];
    const { result } = renderHook(() =>
      useWorkspaceCwd(tabs[0], tabs, "/home", "s1"),
    );
    expect(result.current.explorerRoot).toBe("/repo-a");
  });

  it("falls back to a terminal in the same space when the active tab is not a terminal", () => {
    const s1 = [termTab(2, "s1", "/repo-a/src")];
    const s2 = [
      editorTab(4, "s2", "/repo-b/main.rs"),
      termTab(5, "s2", "/repo-b/lib"),
    ];
    const initial: Args = {
      active: s1[0],
      all: [...s1],
      home: "/home",
      spaceId: "s1",
    };

    const { rerender, result } = renderHook(
      (a: Args) => useWorkspaceCwd(a.active, a.all, a.home, a.spaceId),
      { initialProps: initial },
    );
    expect(result.current.explorerRoot).toBe("/repo-a/src");

    // Switch to another space whose active tab is an editor tab.
    const next: Args = {
      active: s2[0],
      all: [...s1, ...s2],
      home: "/home",
      spaceId: "s2",
    };
    rerender(next);
    expect(result.current.explorerRoot).toBe("/repo-b/lib");
  });

  it("does not leak the previous space's cwd when the new space has no terminals", () => {
    const s1 = [termTab(1, "s1", "/repo-a")];
    const s2 = [editorTab(2, "s2", "/repo-b/index.ts")];

    const { rerender, result } = renderHook(
      (a: Args) => useWorkspaceCwd(a.active, a.all, a.home, a.spaceId),
      {
        initialProps: {
          active: s1[0],
          all: [...s1],
          home: "/home",
          spaceId: "s1",
        } satisfies Args,
      },
    );
    expect(result.current.explorerRoot).toBe("/repo-a");

    // Space s2 has no terminal tabs at all: must fall back to home, not keep
    // /repo-a from the previous space.
    rerender({
      active: s2[0],
      all: [...s1, ...s2],
      home: "/home",
      spaceId: "s2",
    });
    expect(result.current.explorerRoot).toBe("/home");
  });

  it("returns home when there is no terminal anywhere", () => {
    const tabs = [editorTab(1, "s1", "/x/a.ts")];
    const { result } = renderHook(() =>
      useWorkspaceCwd(tabs[0], tabs, "/home", "s1"),
    );
    expect(result.current.explorerRoot).toBe("/home");
  });

  it("inheritedCwdForNewTab follows the same space-scoped rules", () => {
    const s1 = [termTab(1, "s1", "/repo-a")];
    const s2 = [editorTab(2, "s2", "/repo-b/index.ts")];
    const { rerender, result } = renderHook(
      (a: Args) => useWorkspaceCwd(a.active, a.all, a.home, a.spaceId),
      {
        initialProps: {
          active: s1[0],
          all: [...s1],
          home: "/home",
          spaceId: "s1",
        } satisfies Args,
      },
    );
    expect(result.current.inheritedCwdForNewTab()).toBe("/repo-a");

    rerender({
      active: s2[0],
      all: [...s1, ...s2],
      home: "/home",
      spaceId: "s2",
    });
    expect(result.current.inheritedCwdForNewTab()).toBe("/home");
  });
});
