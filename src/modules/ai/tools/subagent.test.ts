import { describe, expect, it, vi } from "vitest";
import type { ToolContext } from "./context";

const runSubagent = vi.hoisted(() => vi.fn());

vi.mock("../agents/runSubagent", () => ({ runSubagent }));
vi.mock("../store/chatStore", () => ({
  useChatStore: {
    getState: () => ({
      apiKeys: {},
      selectedModelId: "any",
      patchAgentMeta: () => {},
    }),
  },
}));

import { buildSubagentTools } from "./subagent";

const ctx = {} as unknown as ToolContext;

describe("run_subagent abort", () => {
  it("maps abort to aborted result", async () => {
    runSubagent.mockRejectedValue(
      new DOMException("Request aborted", "AbortError"),
    );
    const controller = new AbortController();
    controller.abort();
    const tools = buildSubagentTools(ctx);
    const r = (await tools.run_subagent.execute!(
      { type: "explore", prompt: "p" },
      {
        toolCallId: "t1",
        messages: [],
        abortSignal: controller.signal,
      } as never,
    )) as Record<string, unknown>;
    expect(r).toEqual({ type: "explore", aborted: true });
  });

  it("maps non-abort failure to error result", async () => {
    runSubagent.mockRejectedValue(new Error("boom"));
    const tools = buildSubagentTools(ctx);
    const r = (await tools.run_subagent.execute!(
      { type: "explore", prompt: "p" },
      { toolCallId: "t1", messages: [] } as never,
    )) as Record<string, unknown>;
    expect(r).toMatchObject({ type: "explore", error: expect.any(String) });
  });
});
