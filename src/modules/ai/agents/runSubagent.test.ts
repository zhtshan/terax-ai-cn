import { describe, expect, it, vi } from "vitest";

const generateText = vi.hoisted(() => vi.fn());

vi.mock("ai", () => ({
  generateText,
  stepCountIs: vi.fn(() => ({})),
}));

vi.mock("../lib/agent", () => ({
  buildLanguageModel: vi.fn(async () => ({})),
}));

vi.mock("../tools/fs", () => ({ buildFsTools: vi.fn(() => ({})) }));
vi.mock("../tools/search", () => ({ buildSearchTools: vi.fn(() => ({})) }));

import { DEFAULT_SUBAGENT_MODEL, runSubagent } from "./runSubagent";

describe("runSubagent abort signal", () => {
  it("passes abortSignal through to generateText", async () => {
    generateText.mockResolvedValue({ text: "done", steps: [{ toolCalls: [] }] });
    const controller = new AbortController();
    await runSubagent({
      type: "explore",
      prompt: "p",
      keys: {} as never,
      modelId: DEFAULT_SUBAGENT_MODEL,
      toolContext: {} as never,
      abortSignal: controller.signal,
    });
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({ abortSignal: controller.signal }),
    );
  });

  it("propagates generateText rejection", async () => {
    generateText.mockRejectedValue(new Error("boom"));
    await expect(
      runSubagent({
        type: "explore",
        prompt: "p",
        keys: {} as never,
        modelId: DEFAULT_SUBAGENT_MODEL,
        toolContext: {} as never,
      }),
    ).rejects.toThrow("boom");
  });
});
