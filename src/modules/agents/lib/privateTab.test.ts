import { describe, expect, it } from "vitest";
import type { Tab, TerminalTab } from "@/modules/tabs";
import { isPrivateTab } from "./privateTab";

function terminal(over: Partial<TerminalTab> = {}): TerminalTab {
  return {
    id: 1,
    kind: "terminal",
    spaceId: "default",
    title: "shell",
    paneTree: { kind: "leaf", id: 2 },
    activeLeafId: 2,
    ...over,
  };
}

describe("isPrivateTab", () => {
  it("matches private terminal tabs", () => {
    expect(isPrivateTab([terminal({ private: true })], 1)).toBe(true);
  });

  it("does not match regular terminal tabs", () => {
    expect(isPrivateTab([terminal()], 1)).toBe(false);
  });

  it("does not match missing tabs or non-terminal kinds", () => {
    const editor: Tab = {
      id: 2,
      kind: "editor",
      spaceId: "default",
      title: "a.ts",
      path: "/tmp/a.ts",
      dirty: false,
      preview: false,
    };
    expect(isPrivateTab([editor], 2)).toBe(false);
    expect(isPrivateTab([], 1)).toBe(false);
  });
});
