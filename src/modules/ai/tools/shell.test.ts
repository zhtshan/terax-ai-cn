import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolContext } from "./context";

const native = vi.hoisted(() => ({
  shellSessionOpen: vi.fn(),
  shellSessionRun: vi.fn(),
  shellSessionInterrupt: vi.fn(),
}));

vi.mock("../lib/native", () => ({ native }));

import { buildShellTools } from "./shell";

const ctx = {
  getSessionId: () => "s1",
  getCwd: () => null,
} as unknown as ToolContext;

const runOutput = {
  stdout: "out",
  stderr: "",
  exit_code: 0,
  timed_out: false,
  truncated: false,
  interrupted: false,
  cwd_after: "/tmp",
};

type ExecOpts = { abortSignal?: AbortSignal };

function exec(
  tools: ReturnType<typeof buildShellTools>,
  input: { command: string },
  opts: ExecOpts = {},
) {
  return tools.bash_run.execute!(input, {
    toolCallId: "t1",
    messages: [],
    ...opts,
  } as never) as unknown as Promise<Record<string, unknown>>;
}

describe("bash_run abort channel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    native.shellSessionOpen.mockResolvedValue(7);
    native.shellSessionRun.mockResolvedValue(runOutput);
    native.shellSessionInterrupt.mockResolvedValue(true);
  });

  it("passes through interrupted flag", async () => {
    const tools = buildShellTools(ctx);
    const r = await exec(tools, { command: "ls" });
    expect(r).toMatchObject({ command: "ls", interrupted: false });
  });

  it("returns interrupted without running when signal already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const tools = buildShellTools(ctx);
    const r = await exec(
      tools,
      { command: "sleep 100" },
      { abortSignal: controller.signal },
    );
    expect(r).toEqual({ command: "sleep 100", interrupted: true });
    expect(native.shellSessionRun).not.toHaveBeenCalled();
  });

  it("interrupts the shell when aborted mid-run", async () => {
    const controller = new AbortController();
    native.shellSessionRun.mockImplementation(async () => {
      controller.abort();
      return { ...runOutput, interrupted: true };
    });
    const tools = buildShellTools(ctx);
    const r = await exec(
      tools,
      { command: "sleep 100" },
      { abortSignal: controller.signal },
    );
    expect(native.shellSessionInterrupt).toHaveBeenCalledWith(7);
    expect(r).toMatchObject({ interrupted: true });
  });

  it("removes abort listener after run completes", async () => {
    const controller = new AbortController();
    const removeSpy = vi.spyOn(controller.signal, "removeEventListener");
    const tools = buildShellTools(ctx);
    await exec(tools, { command: "ls" }, { abortSignal: controller.signal });
    expect(removeSpy).toHaveBeenCalledWith("abort", expect.any(Function));
  });
});
