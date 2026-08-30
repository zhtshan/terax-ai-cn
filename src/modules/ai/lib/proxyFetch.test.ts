import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => {
  class Channel<T> {
    onmessage: ((event: T) => void) | null = null;
  }
  return { Channel, invoke };
});

type Evt =
  | { kind: "headers"; status: number; headers: Record<string, string> }
  | { kind: "chunk"; bytes: number[] }
  | { kind: "end" }
  | { kind: "error"; message: string };

import { createProxyFetch } from "./proxyFetch";

type StreamArgs = { onEvent?: { onmessage: ((e: Evt) => void) | null } };

function streamSends(...events: Evt[]) {
  invoke.mockImplementation(async (cmd: string, args?: StreamArgs) => {
    if (cmd !== "ai_http_stream") return undefined;
    const ch = args?.onEvent;
    if (!ch) return undefined;
    queueMicrotask(() => {
      for (const e of events) ch.onmessage?.(e);
    });
    return undefined;
  });
}

const HEADERS = {
  kind: "headers",
  status: 200,
  headers: {},
} as const;

describe("proxyFetch cancel channel", () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it("abort before headers rejects and cancels upstream", async () => {
    streamSends(HEADERS, { kind: "chunk", bytes: [1] });
    const controller = new AbortController();
    const p = createProxyFetch()("https://example.com", {
      signal: controller.signal,
    });
    controller.abort();
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
    expect(invoke).toHaveBeenCalledWith("ai_http_cancel", {
      requestId: expect.any(String),
    });
    const streamArgs = invoke.mock.calls.find(
      (c) => c[0] === "ai_http_stream",
    )?.[1] as StreamArgs;
    expect(typeof (streamArgs as { requestId?: string }).requestId).toBe(
      "string",
    );
  });

  it("abort mid-stream errors the body and cancels upstream", async () => {
    streamSends(HEADERS, { kind: "chunk", bytes: [1, 2, 3] });
    const controller = new AbortController();
    const res = await createProxyFetch()("https://example.com", {
      signal: controller.signal,
    });
    const reader = res.body?.getReader();
    controller.abort();
    await expect(reader?.read()).rejects.toMatchObject({ name: "AbortError" });
    expect(invoke).toHaveBeenCalledWith("ai_http_cancel", {
      requestId: expect.any(String),
    });
  });

  it("consumer cancel cancels upstream", async () => {
    streamSends(HEADERS);
    const res = await createProxyFetch()("https://example.com");
    await res.body?.cancel();
    expect(invoke).toHaveBeenCalledWith("ai_http_cancel", {
      requestId: expect.any(String),
    });
  });

  it("natural end does not cancel upstream", async () => {
    streamSends(HEADERS, { kind: "end" });
    const res = await createProxyFetch()("https://example.com");
    const reader = res.body?.getReader();
    await reader?.read();
    expect(invoke.mock.calls.some((c) => c[0] === "ai_http_cancel")).toBe(
      false,
    );
  });
});
