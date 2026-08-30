import type { ToolExecutionOptions } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolContext } from "./context";

const nativeMock = vi.hoisted(() => ({
  canonicalize: vi.fn(async (path: string) => path),
  readFile: vi.fn(),
  writeFile: vi.fn(async () => undefined),
  readDir: vi.fn(async () => []),
}));

vi.mock("../lib/native", () => ({ native: nativeMock }));

vi.mock("../lib/security", () => ({
  checkReadableCanonical: vi.fn(async (path: string) => ({
    ok: true as const,
    canonical: path,
  })),
  checkWritableCanonical: vi.fn(async (path: string) => ({
    ok: true as const,
    canonical: path,
  })),
}));

vi.mock("../store/planStore", () => ({
  newQueuedEditId: () => "queued-edit",
  usePlanStore: { getState: () => ({ active: false, enqueue: vi.fn() }) },
}));

import { buildFsTools } from "./fs";

const FILE = "/workspace/doc.md";

function makeContext() {
  return {
    getCwd: () => "/workspace",
    getWorkspaceRoot: () => "/workspace",
    getTerminalContext: () => null,
    isActiveTerminalPrivate: () => false,
    injectIntoActivePty: () => false,
    openPreview: () => false,
    spawnAgent: () => null,
    readAgentOutput: () => null,
    readCache: new Map<
      string,
      { size: number; hash: number; truncated?: boolean }
    >(),
    getSessionId: () => "session",
  } as unknown as ToolContext;
}

function setFile(content: string) {
  nativeMock.readFile.mockResolvedValue({
    kind: "text",
    content,
    size: content.length,
  });
}

const toolOptions: ToolExecutionOptions = {
  toolCallId: "tool-call",
  messages: [],
};

const ctx = makeContext();
const readFile = buildFsTools(ctx).read_file;

async function call(input: {
  path: string;
  offset?: number;
  limit?: number;
}) {
  return (await readFile.execute!(input as never, toolOptions)) as Record<
    string,
    unknown
  >;
}

beforeEach(() => {
  ctx.readCache.clear();
  nativeMock.readFile.mockReset();
});

describe("read_file full read", () => {
  it("small file returns full content without truncation", async () => {
    setFile("a\nb\nc");
    const r = await call({ path: FILE });
    expect(r.content).toBe("a\nb\nc");
    expect(r.total_lines).toBe(3);
    expect(r.truncated).toBeUndefined();
  });

  it("byte-cap truncation falls back to a line boundary and reports next_offset", async () => {
    const lineA = "A".repeat(20_000);
    const lineB = "B".repeat(20_000);
    const lineC = "C".repeat(20_000);
    setFile([lineA, lineB, lineC].join("\n"));

    const r = await call({ path: FILE });
    expect(r.truncated).toBe(true);
    expect(r.content).toBe(lineA);
    expect(r.next_offset).toBe(1);
    expect(String(r.hint)).toContain("offset=1");
  });

  it("line-cap truncation reports next_offset", async () => {
    setFile(
      Array.from({ length: 3000 }, (_, i) => `line ${i}`).join("\n"),
    );
    const r = await call({ path: FILE });
    expect(r.truncated).toBe(true);
    expect(r.next_offset).toBe(2000);
    const lines = String(r.content).split("\n");
    expect(lines).toHaveLength(2000);
  });

  it("re-reading a truncated file is not served from the unchanged cache", async () => {
    const lineA = "A".repeat(20_000);
    const lineB = "B".repeat(20_000);
    const lineC = "C".repeat(20_000);
    setFile([lineA, lineB, lineC].join("\n"));

    const first = await call({ path: FILE });
    expect(first.truncated).toBe(true);
    const second = await call({ path: FILE });
    expect(second.unchanged).toBeUndefined();
    expect(second.content).toBe(lineA);
  });

  it("re-reading an untruncated file hits the unchanged cache", async () => {
    setFile("a\nb\nc");
    await call({ path: FILE });
    const second = await call({ path: FILE });
    expect(second.unchanged).toBe(true);
    expect(second.content).toBeUndefined();
  });
});

describe("read_file offset windowing", () => {
  it("returns the requested window with start/end lines", async () => {
    setFile("l0\nl1\nl2\nl3");
    const r = await call({ path: FILE, offset: 1, limit: 2 });
    expect(r.content).toBe("l1\nl2");
    expect(r.start_line).toBe(1);
    expect(r.end_line).toBe(3);
    expect(r.truncated).toBe(true);
    expect(r.next_offset).toBe(3);
  });

  it("offset past EOF returns eof instead of empty content", async () => {
    setFile("a\nb\nc");
    const r = await call({ path: FILE, offset: 10 });
    expect(r.eof).toBe(true);
    expect(r.total_lines).toBe(3);
    expect(r.content).toBeUndefined();
  });
});
