import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type Agent,
  BUILTIN_AGENTS,
  findAgent,
  type TerminalBuiltin,
  TERMINAL_BUILTINS,
  TERMINAL_BUILTIN_LABELS,
} from "./agents";

// Stub out the Tauri store so loadAgents can run without the runtime.
// The real LazyStore is a class (callable via `new`); the factory must return
// a constructor — not an object with a LazyStore property — or vitest v4
// rejects it with "is not a constructor".
const native = vi.hoisted(() => ({
  seed: [] as Array<[string, unknown]>,
}));
vi.mock("@tauri-apps/plugin-store", () => {
  function MockLazyStore(this: {
    entries: () => Promise<Array<[string, unknown]>>;
    set: (k: string, v: unknown) => Promise<void>;
    save: () => Promise<void>;
  }) {
    this.entries = async () => native.seed;
    this.set = async () => undefined;
    this.save = async () => undefined;
  }
  return { LazyStore: MockLazyStore };
});

async function load() {
  vi.resetModules();
  return import("./agents");
}

beforeEach(() => {
  native.seed.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
});

const custom: Agent = {
  id: "a-1",
  name: "Mine",
  description: "",
  instructions: "",
  icon: "spark",
  builtIn: false,
  terminalCommand: "mine",
  terminalAgent: "claude",
};

const all = [...BUILTIN_AGENTS, custom];

describe("BUILTIN_AGENTS", () => {
  it("all carry unique ids and the builtIn flag", () => {
    const ids = BUILTIN_AGENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(BUILTIN_AGENTS.every((a) => a.builtIn)).toBe(true);
  });
});

describe("findAgent", () => {
  it("returns the agent whose id matches", () => {
    expect(findAgent(all, "a-1")).toBe(custom);
  });

  it("falls back to the first builtin for a missing id", () => {
    expect(findAgent(all, "does-not-exist")).toBe(BUILTIN_AGENTS[0]);
  });

  it("falls back to the first builtin for null, undefined, or empty id", () => {
    expect(findAgent(all, null)).toBe(BUILTIN_AGENTS[0]);
    expect(findAgent(all, undefined)).toBe(BUILTIN_AGENTS[0]);
    expect(findAgent(all, "")).toBe(BUILTIN_AGENTS[0]);
  });
});

describe("TerminalBuiltin exports", () => {
  it("TERMINAL_BUILTINS is a non-empty readonly list", () => {
    expect(Array.isArray(TERMINAL_BUILTINS)).toBe(true);
    expect(TERMINAL_BUILTINS.length).toBeGreaterThan(0);
  });

  it("TERMINAL_BUILTIN_LABELS covers every builtin", () => {
    for (const b of TERMINAL_BUILTINS) {
      expect(typeof TERMINAL_BUILTIN_LABELS[b]).toBe("string");
      expect(TERMINAL_BUILTIN_LABELS[b].length).toBeGreaterThan(0);
    }
  });
});

describe("Agent terminal wiring", () => {
  it("BUILTIN_AGENTS all carry non-empty terminalCommand and a valid terminalAgent", () => {
    for (const a of BUILTIN_AGENTS) {
      expect(a.terminalCommand.length).toBeGreaterThan(0);
      expect(TERMINAL_BUILTINS.includes(a.terminalAgent)).toBe(true);
    }
  });

  it("loadAgents backfills missing terminal fields with defaults", async () => {
    native.seed.push(["customAgents", [{ id: "legacy", name: "legacy-agent" }]]);
    const loaded = (await load()).loadAgents();
    const found = (await loaded).custom.find((a: Agent) => a.id === "legacy");
    expect(found).toBeDefined();
    expect(found!.terminalCommand).toBe("legacy-agent");
    expect(found!.terminalAgent).toBe("claude" satisfies TerminalBuiltin);
  });

  it("loadAgents preserves explicit terminalCommand / terminalAgent", async () => {
    native.seed.push([
      "customAgents",
      [
        {
          id: "c-1",
          name: "My Codex",
          terminalCommand: "codex-run",
          terminalAgent: "codex",
        },
      ],
    ]);
    const loaded = (await load()).loadAgents();
    const found = (await loaded).custom.find((a: Agent) => a.id === "c-1");
    expect(found).toBeDefined();
    expect(found!.terminalCommand).toBe("codex-run");
    expect(found!.terminalAgent).toBe("codex");
  });
});
