// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSearchRun } from "./useSearchRun";
import type { GrepResponse, SearchInput } from "../lib/types";

const { searchContent } = vi.hoisted(() => ({
  searchContent: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  searchContent,
}));

const sampleInput: SearchInput = {
  pattern: "needle",
  root: "/workspace",
  regex: false,
  case_sensitive: false,
  whole_word: false,
};

const sampleResponse: GrepResponse = {
  hits: [{ path: "/workspace/a.ts", rel: "a.ts", line: 1, text: "needle" }],
  truncated: false,
  files_scanned: 1,
};

describe("useSearchRun", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    searchContent.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces: only one invoke fires across rapid input changes", async () => {
    let resolveSearch!: (res: GrepResponse) => void;
    searchContent.mockImplementation(
      () => new Promise<GrepResponse>((resolve) => {
        resolveSearch = resolve;
      }),
    );

    const { rerender } = renderHook(
      ({ input }: { input: SearchInput | null }) =>
        useSearchRun({ input, debounceMs: 300 }),
      { initialProps: { input: { ...sampleInput, pattern: "ne" } } },
    );

    rerender({ input: { ...sampleInput, pattern: "nee" } });
    rerender({ input: { ...sampleInput, pattern: "need" } });
    rerender({ input: { ...sampleInput, pattern: "needle" } });
    expect(searchContent).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(searchContent).toHaveBeenCalledTimes(1);
    expect(searchContent).toHaveBeenCalledWith({
      ...sampleInput,
      pattern: "needle",
    });

    await act(async () => {
      resolveSearch(sampleResponse);
    });
  });

  it("cancels stale responses when generation advances", async () => {
    const resolvers: Array<(res: GrepResponse) => void> = [];
    searchContent.mockImplementation(
      () => new Promise<GrepResponse>((resolve) => {
        resolvers.push(resolve);
      }),
    );

    const { rerender, result } = renderHook(
      ({ input }: { input: SearchInput | null }) =>
        useSearchRun({ input, debounceMs: 100 }),
      { initialProps: { input: { ...sampleInput, pattern: "first" } } },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(searchContent).toHaveBeenCalledTimes(1);

    rerender({ input: { ...sampleInput, pattern: "second" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(searchContent).toHaveBeenCalledTimes(2);

    const staleResponse: GrepResponse = {
      hits: [{ path: "/stale.ts", rel: "stale.ts", line: 0, text: "first" }],
      truncated: false,
      files_scanned: 0,
    };
    const firstResolve = resolvers[0];
    const secondResolve = resolvers[1];
    expect(firstResolve).toBeDefined();
    expect(secondResolve).toBeDefined();
    await act(async () => {
      firstResolve?.(staleResponse);
    });

    expect(result.current.results).toBeNull();
    expect(result.current.loading).toBe(true);

    await act(async () => {
      secondResolve?.(sampleResponse);
    });
    expect(result.current.results).toEqual(sampleResponse);
    expect(result.current.loading).toBe(false);
  });

  it("captures the error message when searchContent rejects", async () => {
    let rejectSearch!: (err: unknown) => void;
    searchContent.mockImplementation(
      () =>
        new Promise<GrepResponse>((_resolve, reject) => {
          rejectSearch = reject;
        }),
    );

    const { result } = renderHook(() =>
      useSearchRun({ input: sampleInput, debounceMs: 50 }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    await act(async () => {
      rejectSearch(new Error("boom"));
    });

    expect(result.current.error).toBe("boom");
    expect(result.current.loading).toBe(false);
    expect(result.current.results).toBeNull();
  });

  it("does not invoke searchContent when enabled is false", async () => {
    searchContent.mockResolvedValue(sampleResponse);

    renderHook(() =>
      useSearchRun({ input: sampleInput, debounceMs: 50, enabled: false }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(searchContent).not.toHaveBeenCalled();
  });

  it("does not invoke searchContent when input is null", async () => {
    searchContent.mockResolvedValue(sampleResponse);

    renderHook(() =>
      useSearchRun({ input: null, debounceMs: 50 }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(searchContent).not.toHaveBeenCalled();
  });

  it("cancels_stale_results_when_input_becomes_null", async () => {
    // Regression for I2: when input transitions to null while a previous
    // search is in flight, the early-return path must bump the generation
    // so the stale promise resolves to a stale myGen and is discarded.
    let resolveSearch!: (res: GrepResponse) => void;
    searchContent.mockImplementation(
      () => new Promise<GrepResponse>((resolve) => {
        resolveSearch = resolve;
      }),
    );

    const { rerender, result } = renderHook(
      ({ input }: { input: SearchInput | null }) =>
        useSearchRun({ input, debounceMs: 100 }),
      { initialProps: { input: { ...sampleInput, pattern: "first" } as SearchInput | null } },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(searchContent).toHaveBeenCalledTimes(1);

    // Clear input — early return path must bump generation.
    rerender({ input: null });

    const staleResponse: GrepResponse = {
      hits: [{ path: "/stale.ts", rel: "stale.ts", line: 0, text: "first" }],
      truncated: false,
      files_scanned: 0,
    };
    await act(async () => {
      resolveSearch(staleResponse);
    });

    expect(result.current.results).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("retry() bumps the retry token and re-fires the search", async () => {
    searchContent.mockResolvedValue(sampleResponse);

    const { result } = renderHook(() =>
      useSearchRun({ input: sampleInput, debounceMs: 50 }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(searchContent).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.retry();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(searchContent).toHaveBeenCalledTimes(2);
  });
});
