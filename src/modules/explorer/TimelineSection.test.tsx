import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TimelineSection } from "./TimelineSection";

vi.mock("@/modules/ai/lib/native", () => ({
  native: {
    gitResolveRepo: vi.fn(),
    gitLogFile: vi.fn(),
  },
}));

import { native } from "@/modules/ai/lib/native";

const FIXED_TS = 1_700_000_000;

function makeEntry(over: Partial<{
  sha: string;
  shortSha: string;
  subject: string;
  author: string;
  timestampSecs: number;
  oldPath: string | null;
}> = {}) {
  return {
    sha: "deadbeef1234567890abcdef",
    shortSha: "deadbee",
    author: "Alice",
    authorEmail: "alice@example.com",
    timestampSecs: FIXED_TS,
    parents: [],
    subject: "fix: timeline test",
    filesChanged: 1,
    insertions: 1,
    deletions: 0,
    oldPath: null,
    ...over,
  };
}

describe("TimelineSection", () => {
  it("shows no-file empty state when activeFilePath is null", () => {
    render(
      <TimelineSection
        collapsed={false}
        onToggle={() => {}}
        activeFilePath={null}
        repoRoot={null}
        onOpenCommitFile={() => {}}
      />,
    );
    expect(screen.getByText("未选择文件")).toBeTruthy();
  });

  it("loads and renders commits when activeFilePath resolves to a repo", async () => {
    (native.gitResolveRepo as ReturnType<typeof vi.fn>).mockResolvedValue({
      repoRoot: "/r",
      branch: "main",
      upstream: null,
      isDetached: false,
    });
    (native.gitLogFile as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeEntry({ subject: "first commit" }),
      makeEntry({ sha: "beefcafebeefcafebeefcafe", shortSha: "beefcaf", subject: "second commit" }),
    ]);

    render(
      <TimelineSection
        collapsed={false}
        onToggle={() => {}}
        activeFilePath="/r/foo.txt"
        repoRoot={null}
        onOpenCommitFile={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("first commit")).toBeTruthy();
    });
    expect(screen.getByText("second commit")).toBeTruthy();
    expect(screen.getByText("deadbee")).toBeTruthy();
  });

  it("shows empty state when gitLogFile returns []", async () => {
    (native.gitResolveRepo as ReturnType<typeof vi.fn>).mockResolvedValue({
      repoRoot: "/r",
      branch: "main",
      upstream: null,
      isDetached: false,
    });
    (native.gitLogFile as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    render(
      <TimelineSection
        collapsed={false}
        onToggle={() => {}}
        activeFilePath="/r/new.txt"
        repoRoot={null}
        onOpenCommitFile={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("暂无提交历史")).toBeTruthy();
    });
  });

  it("shows outside-repo message when gitResolveRepo returns null", async () => {
    (native.gitResolveRepo as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    render(
      <TimelineSection
        collapsed={false}
        onToggle={() => {}}
        activeFilePath="/tmp/loose.txt"
        repoRoot={null}
        onOpenCommitFile={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("当前文件不在 Git 仓库内")).toBeTruthy();
    });
  });
});