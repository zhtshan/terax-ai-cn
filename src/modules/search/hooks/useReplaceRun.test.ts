// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useReplaceRun } from "./useReplaceRun";
import type {
  GrepResponse,
  ReplaceError,
  ReplaceFileResult,
  ReplaceInput,
  ReplaceResponse,
} from "../lib/types";

const { replaceAll, checkWritableCanonical } = vi.hoisted(() => ({
  replaceAll: vi.fn(),
  checkWritableCanonical: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  replaceAll,
}));

vi.mock("@/modules/ai/lib/security", () => ({
  checkWritableCanonical,
}));

const sampleInput: Omit<ReplaceInput, "replacement"> = {
  pattern: "needle",
  root: "/workspace",
  regex: false,
  caseSensitive: false,
  wholeWord: false,
};

const sampleResponse: GrepResponse = {
  hits: [
    { path: "/workspace/a.ts", rel: "a.ts", line: 1, text: "needle" },
    { path: "/workspace/b.ts", rel: "b.ts", line: 5, text: "needle" },
    { path: "/workspace/a.ts", rel: "a.ts", line: 10, text: "needle" },
  ],
  truncated: false,
  files_scanned: 2,
};

const okResponse: ReplaceResponse = {
  files_changed: [
    { path: "/workspace/a.ts", replacements: 2 },
    { path: "/workspace/b.ts", replacements: 1 },
  ],
  errors: [],
  total_replacements: 3,
  truncated: false,
};

const partialFileChanged: ReplaceFileResult[] = [
  { path: "/workspace/a.ts", replacements: 2 },
];

const partialErrors: ReplaceError[] = [
  { path: "/workspace/b.ts", reason: "permission denied" },
];

const partialResponse: ReplaceResponse = {
  files_changed: partialFileChanged,
  errors: partialErrors,
  total_replacements: 2,
  truncated: false,
};

describe("useReplaceRun", () => {
  beforeEach(() => {
    replaceAll.mockReset();
    checkWritableCanonical.mockReset();
    checkWritableCanonical.mockResolvedValue({
      ok: true,
      canonical: "/canon/path",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts in idle state", () => {
    const { result } = renderHook(() =>
      useReplaceRun({
        results: sampleResponse,
        replacement: "haystack",
        input: sampleInput,
      }),
    );
    expect(result.current.state.kind).toBe("idle");
  });

  it("double_click_is_idempotent", async () => {
    // Regression for I3: the deny-list gate is async, so a fast double-click
    // could enter `replace()` twice before the first call flipped
    // state.kind to "running". The inFlightRef guard must reject the
    // second click before it reaches the gate.
    replaceAll.mockResolvedValue(okResponse);

    // Track every gate invocation as its own pending promise so we can
    // drain them deterministically (the original variant leaked the last
    // captured `resolve` and timed out when more than one path needed to
    // be checked).
    const pendingGates: Array<() => void> = [];
    checkWritableCanonical.mockImplementation(
      () =>
        new Promise<{ ok: true; canonical: string }>((resolve) => {
          pendingGates.push(() =>
            resolve({ ok: true, canonical: "/canon/path" }),
          );
        }),
    );

    const { result } = renderHook(() =>
      useReplaceRun({
        results: sampleResponse,
        replacement: "haystack",
        input: sampleInput,
      }),
    );

    // Fire two synchronous clicks. The first sets inFlightRef=true before
    // awaiting the gate, so the second must early-return without entering
    // the gate loop.
    let first: Promise<void> | undefined;
    let second: Promise<void> | undefined;
    act(() => {
      first = result.current.replace();
    });
    act(() => {
      second = result.current.replace();
    });

    await act(async () => {
      // Drain pending gate calls in order — each resolution lets the
      // hook progress to the next iteration (or to replaceAll).
      while (pendingGates.length > 0) {
        const resolve = pendingGates.shift();
        resolve?.();
        await Promise.resolve();
      }
      if (first) await first;
      if (second) await second;
    });

    // The gate should have been entered exactly once (first call only).
    // sampleResponse has two unique paths, so at most 2 gate checks
    // — but never more, because the second replace() returned early.
    expect(checkWritableCanonical).toHaveBeenCalledTimes(2);
    expect(replaceAll).toHaveBeenCalledTimes(1);
    expect(result.current.state.kind).toBe("done");
  });

  it("replace() walks idle → running → done on a successful batch", async () => {
    replaceAll.mockResolvedValue(okResponse);

    const { result } = renderHook(() =>
      useReplaceRun({
        results: sampleResponse,
        replacement: "haystack",
        input: sampleInput,
      }),
    );

    await act(async () => {
      await result.current.replace();
    });

    expect(result.current.state.kind).toBe("done");
    if (result.current.state.kind === "done") {
      expect(result.current.state.filesChanged).toEqual(okResponse.files_changed);
      expect(result.current.state.totalReplacements).toBe(3);
    }
    // Deny-list gate must check each unique file once (a.ts appears twice,
    // b.ts once) — 2 calls, not 3.
    expect(checkWritableCanonical).toHaveBeenCalledTimes(2);
    expect(replaceAll).toHaveBeenCalledTimes(1);
    expect(replaceAll).toHaveBeenCalledWith({
      ...sampleInput,
      replacement: "haystack",
    });
  });

  it("replace() refuses the whole batch when the deny-list gate rejects a path", async () => {
    checkWritableCanonical.mockImplementation(async (p: string) => {
      if (p === "/workspace/a.ts") {
        return { ok: false, reason: "blocked" };
      }
      return { ok: true, canonical: p };
    });

    const { result } = renderHook(() =>
      useReplaceRun({
        results: sampleResponse,
        replacement: "haystack",
        input: sampleInput,
      }),
    );

    await act(async () => {
      await result.current.replace();
    });

    expect(result.current.state.kind).toBe("error");
    if (result.current.state.kind === "error") {
      expect(result.current.state.message).toContain("/workspace/a.ts");
      expect(result.current.state.message).toContain("blocked");
    }
    // Replace must NOT run when the gate refuses.
    expect(replaceAll).not.toHaveBeenCalled();
  });

  it("replace() reports partial when some files failed", async () => {
    replaceAll.mockResolvedValue(partialResponse);

    const { result } = renderHook(() =>
      useReplaceRun({
        results: sampleResponse,
        replacement: "haystack",
        input: sampleInput,
      }),
    );

    await act(async () => {
      await result.current.replace();
    });

    expect(result.current.state.kind).toBe("partial");
    if (result.current.state.kind === "partial") {
      expect(result.current.state.filesChanged).toEqual(partialFileChanged);
      expect(result.current.state.errors).toEqual(partialErrors);
      expect(result.current.state.totalReplacements).toBe(2);
    }
  });

  it("replace() reports error when all files failed and no files changed", async () => {
    const allErrors: ReplaceResponse = {
      files_changed: [],
      errors: [{ path: "/workspace/a.ts", reason: "io error" }],
      total_replacements: 0,
      truncated: false,
    };
    replaceAll.mockResolvedValue(allErrors);

    const { result } = renderHook(() =>
      useReplaceRun({
        results: sampleResponse,
        replacement: "haystack",
        input: sampleInput,
      }),
    );

    await act(async () => {
      await result.current.replace();
    });

    expect(result.current.state.kind).toBe("error");
    if (result.current.state.kind === "error") {
      expect(result.current.state.message).toContain("io error");
    }
  });

  it("replace() returns to done with empty filesChanged when zero matches", async () => {
    const emptyResults: GrepResponse = {
      hits: [],
      truncated: false,
      files_scanned: 0,
    };

    const { result } = renderHook(() =>
      useReplaceRun({
        results: emptyResults,
        replacement: "haystack",
        input: sampleInput,
      }),
    );

    await act(async () => {
      await result.current.replace();
    });

    expect(result.current.state.kind).toBe("done");
    if (result.current.state.kind === "done") {
      expect(result.current.state.filesChanged).toEqual([]);
      expect(result.current.state.totalReplacements).toBe(0);
    }
    // No gate calls, no IPC call.
    expect(checkWritableCanonical).not.toHaveBeenCalled();
    expect(replaceAll).not.toHaveBeenCalled();
  });

  it("replace() rejects empty replacement without invoking the backend", async () => {
    const { result } = renderHook(() =>
      useReplaceRun({
        results: sampleResponse,
        replacement: "",
        input: sampleInput,
      }),
    );

    await act(async () => {
      await result.current.replace();
    });

    expect(result.current.state.kind).toBe("error");
    if (result.current.state.kind === "error") {
      expect(result.current.state.message).toContain("empty");
    }
    expect(checkWritableCanonical).not.toHaveBeenCalled();
    expect(replaceAll).not.toHaveBeenCalled();
  });

  it("replace() is a no-op when input is null", async () => {
    const { result } = renderHook(() =>
      useReplaceRun({
        results: sampleResponse,
        replacement: "haystack",
        input: null,
      }),
    );

    await act(async () => {
      await result.current.replace();
    });

    expect(result.current.state.kind).toBe("idle");
    expect(checkWritableCanonical).not.toHaveBeenCalled();
    expect(replaceAll).not.toHaveBeenCalled();
  });

  it("replace() captures thrown errors from the IPC layer", async () => {
    replaceAll.mockRejectedValue(new Error("ipc boom"));

    const { result } = renderHook(() =>
      useReplaceRun({
        results: sampleResponse,
        replacement: "haystack",
        input: sampleInput,
      }),
    );

    await act(async () => {
      await result.current.replace();
    });

    expect(result.current.state.kind).toBe("error");
    if (result.current.state.kind === "error") {
      expect(result.current.state.message).toBe("ipc boom");
    }
  });
});
