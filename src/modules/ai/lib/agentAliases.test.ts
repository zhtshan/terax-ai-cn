import { describe, expect, it } from "vitest";
import type { Agent } from "./agents";
import { deriveFromAgents } from "./agentAliases";

const mk = (over: Partial<Agent>): Agent => ({
  id: "x",
  name: "x",
  description: "",
  instructions: "",
  icon: "coder",
  builtIn: false,
  terminalCommand: "x",
  terminalAgent: "claude",
  ...over,
});

describe("deriveFromAgents", () => {
  it("emits one row per agent using terminalCommand + terminalAgent", () => {
    const out = deriveFromAgents([
      mk({
        id: "a",
        name: "alpha",
        terminalCommand: "ca",
        terminalAgent: "claude",
      }),
      mk({
        id: "b",
        name: "beta",
        terminalCommand: "cca",
        terminalAgent: "claude",
      }),
    ]);
    expect(out).toEqual([
      { command: "ca", agent: "claude", source: "auto", agentId: "a" },
      { command: "cca", agent: "claude", source: "auto", agentId: "b" },
    ]);
  });

  it("skips rows whose command is empty or matches a builtin name", () => {
    const out = deriveFromAgents([
      mk({
        id: "a",
        name: "alpha",
        terminalCommand: "",
        terminalAgent: "claude",
      }),
      mk({
        id: "b",
        name: "beta",
        terminalCommand: "claude",
        terminalAgent: "claude",
      }),
    ]);
    expect(out).toEqual([]);
  });
});
