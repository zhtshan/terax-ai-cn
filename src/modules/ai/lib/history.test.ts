import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { normalizeToolInputsForHistory } from "./history";

function msg(parts: UIMessage["parts"]): UIMessage {
  return { id: "m1", role: "assistant", parts };
}

describe("normalizeToolInputsForHistory", () => {
  it("keeps tool parts whose input is already an object", () => {
    const part = {
      type: "tool-write_file" as const,
      toolCallId: "t1",
      state: "output-available" as const,
      input: { path: "/a.md", content: "hi" },
      output: { ok: true },
    };
    const [out] = normalizeToolInputsForHistory([part]);
    expect(out).toBe(part);
  });

  it("keeps non-tool parts untouched", () => {
    const part = { type: "text" as const, text: "hello" };
    const [out] = normalizeToolInputsForHistory([part]);
    expect(out).toBe(part);
  });

  it("replaces a truncated string input with an empty object", () => {
    const part = {
      type: "tool-write_file" as const,
      toolCallId: "t1",
      state: "output-error" as const,
      input: '{"path": "/tmp/TERAX_zh.md"',
      errorText: "Invalid input for tool write_file: JSON parsing failed",
    };
    const [out] = normalizeToolInputsForHistory([
      part,
    ]) as Array<typeof part>;
    expect(out.input).toEqual({});
  });

  it("parses a string input that holds valid JSON", () => {
    const part = {
      type: "tool-bash_run" as const,
      toolCallId: "t2",
      state: "output-error" as const,
      input: '{"command": "ls"}',
      errorText: "Invalid input for tool bash_run",
    };
    const [out] = normalizeToolInputsForHistory([
      part,
    ]) as Array<typeof part>;
    expect(out.input).toEqual({ command: "ls" });
  });

  it("normalizes a missing input to an empty object", () => {
    const part = {
      type: "tool-bash_run" as const,
      toolCallId: "t3",
      state: "output-error" as const,
      input: undefined as never,
      errorText: "Invalid input for tool bash_run",
    };
    const [out] = normalizeToolInputsForHistory([
      part,
    ]) as Array<typeof part>;
    expect(out.input).toEqual({});
  });

  it("normalizes a null input to an empty object", () => {
    const part = {
      type: "tool-bash_run" as const,
      toolCallId: "t4",
      state: "output-error" as const,
      input: null as never,
      errorText: "Invalid input for tool bash_run",
    };
    const [out] = normalizeToolInputsForHistory([
      part,
    ]) as Array<typeof part>;
    expect(out.input).toEqual({});
  });

  it("keeps the empty object that the SDK derives from empty arguments", () => {
    const part = {
      type: "tool-bash_run" as const,
      toolCallId: "t5",
      state: "output-error" as const,
      input: {},
      errorText: "Invalid input for tool bash_run",
    };
    const [out] = normalizeToolInputsForHistory([part]);
    expect(out).toBe(part);
  });

  it("keeps an empty-string input part reachable via a message", () => {
    const part = {
      type: "tool-bash_run" as const,
      toolCallId: "t6",
      state: "output-error" as const,
      input: "",
      errorText: "Invalid input for tool bash_run",
    };
    const out = normalizeToolInputsForHistory(msg([part]).parts);
    expect(out).toHaveLength(1);
  });
});
