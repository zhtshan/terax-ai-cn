import { describe, expect, it } from "vitest";
import { labelFor, subtitleFor } from "./tabLabel";
import type { EditorTab, MarkdownTab, PreviewTab, TerminalTab } from "./useTabs";

function terminalTab(over: Partial<TerminalTab> = {}): TerminalTab {
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

describe("labelFor (terminal tabs)", () => {
  it("derives the label from the last cwd segment", () => {
    expect(labelFor(terminalTab({ cwd: "/Users/me/projects/terax-ai" }))).toBe(
      "terax-ai",
    );
  });

  it("falls back to the title when there is no cwd", () => {
    expect(labelFor(terminalTab({ title: "private" }))).toBe("private");
  });

  it("prefers a custom title over the cwd-derived name", () => {
    expect(
      labelFor(terminalTab({ cwd: "/Users/me/projects/terax-ai", customTitle: "Server" })),
    ).toBe("Server");
  });

  it("keeps the custom title after the cwd changes (survives cd)", () => {
    const renamed = terminalTab({ cwd: "/Users/me/a", customTitle: "Server" });
    const afterCd = { ...renamed, cwd: "/Users/me/b/c" };
    expect(labelFor(afterCd)).toBe("Server");
  });

  it("handles Windows-style cwd separators", () => {
    expect(labelFor(terminalTab({ cwd: "C:\\Users\\me\\proj" }))).toBe("proj");
  });
});

describe("subtitleFor", () => {
  it("returns the last two cwd segments for terminal tabs", () => {
    expect(
      subtitleFor(terminalTab({ cwd: "/Users/me/projects/terax-ai" })),
    ).toBe("projects/terax-ai");
  });

  it("returns null for terminal tabs without cwd", () => {
    expect(subtitleFor(terminalTab())).toBeNull();
  });

  it("handles Windows-style cwd separators", () => {
    expect(subtitleFor(terminalTab({ cwd: "C:\\Users\\me\\proj" }))).toBe(
      "me/proj",
    );
  });

  it("returns the parent directory for editor tabs", () => {
    const editor: EditorTab = {
      id: 3,
      kind: "editor",
      spaceId: "default",
      title: "a.ts",
      path: "/Users/me/proj/src/a.ts",
      dirty: false,
      preview: false,
    };
    expect(subtitleFor(editor)).toBe("src");
  });

  it("returns the parent directory for markdown tabs", () => {
    const markdown: MarkdownTab = {
      id: 5,
      kind: "markdown",
      spaceId: "default",
      title: "notes.md",
      path: "/Users/me/proj/docs/notes.md",
    };
    expect(subtitleFor(markdown)).toBe("docs");
  });

  it("returns null for tab kinds without a path", () => {
    const preview: PreviewTab = {
      id: 4,
      kind: "preview",
      spaceId: "default",
      title: "localhost",
      url: "http://localhost:5173",
    };
    expect(subtitleFor(preview)).toBeNull();
  });

  it("falls back to the raw cwd when it has only separators", () => {
    expect(subtitleFor(terminalTab({ cwd: "/" }))).toBe("/");
  });

  it("returns null for a root-level file path", () => {
    const editor: EditorTab = {
      id: 6,
      kind: "editor",
      spaceId: "default",
      title: "a.ts",
      path: "/a.ts",
      dirty: false,
      preview: false,
    };
    expect(subtitleFor(editor)).toBeNull();
  });
});
