import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
const detectBinary = vi.fn();
const transportStart = vi.fn();

let capabilities: Record<string, unknown> | undefined;
let resolveInitialize: () => void;
let initializePromise: Promise<void>;
const textDocumentSymbol = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...a: unknown[]) => invoke(...a),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), warning: vi.fn() } }));
vi.mock("@/modules/workspace", () => ({
  currentWorkspaceEnv: () => ({ kind: "local" }),
}));
vi.mock("@/modules/settings/preferences", () => ({
  usePreferencesStore: Object.assign(() => ({}), {
    getState: () => ({
      lspCustomServers: [],
      lspActivation: { typescript: "enabled" },
    }),
    subscribe: () => () => {},
  }),
}));
vi.mock("./detect", () => ({
  detectBinary: (...a: unknown[]) => detectBinary(...a),
}));
vi.mock("./navigator", () => ({ getLspNavigator: () => null }));
vi.mock("./runtimeStore", () => ({
  useLspRuntimeStore: {
    getState: () => ({
      upsertSession: vi.fn(),
      removeSession: vi.fn(),
      removeSessionQuiet: vi.fn(),
      setFailed: vi.fn(),
      clearFailed: vi.fn(),
      bumpGeneration: vi.fn(),
    }),
  },
}));
vi.mock("./transport", () => ({
  TauriLspTransport: class {
    exitInfo = null;
    start = transportStart;
    close = vi.fn();
  },
}));
vi.mock("./client", () => ({
  TeraxLspClient: class {
    static hostPid: number | null = 1;
    get capabilities() {
      return capabilities;
    }
    get initializePromise() {
      return initializePromise;
    }
    textDocumentSymbol = textDocumentSymbol;
    textDocumentDidClose = vi.fn();
    textDocumentDidSave = vi.fn();
    close = vi.fn();
    shutdownGracefully = vi.fn().mockResolvedValue(undefined);
  },
  lspInteractions: () => [],
  languageServerWithTransport: () => [],
  SynchronizationMethod: { Incremental: 1 },
}));

import { acquireDocExtension, requestDocumentSymbols } from "./sessionManager";

const FILE = "/repo/src/widget.ts";

describe("requestDocumentSymbols during server startup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capabilities = undefined;
    initializePromise = new Promise<void>((r) => {
      resolveInitialize = r;
    });
    detectBinary.mockResolvedValue(true);
    invoke.mockImplementation((cmd: string) =>
      cmd === "lsp_resolve_root"
        ? Promise.resolve("/repo")
        : Promise.resolve(1),
    );
    transportStart.mockResolvedValue(undefined);
    textDocumentSymbol.mockResolvedValue([
      { name: "Widget", kind: 5, range: { start: { line: 0, character: 0 } } },
    ]);
  });

  it("waits for initialize instead of reporting the server unsupported", async () => {
    const handle = await acquireDocExtension(FILE, "ts");
    expect(handle).not.toBeNull();

    let settled = false;
    const pending = requestDocumentSymbols(FILE, "ts").then((r) => {
      settled = true;
      return r;
    });

    // The session exists but initialize has not answered yet: the old code
    // read capabilities here and returned null ("not configured") forever.
    await Promise.resolve();
    expect(settled).toBe(false);

    capabilities = { documentSymbolProvider: true };
    resolveInitialize();

    await expect(pending).resolves.toEqual([
      { name: "Widget", kind: 5, range: { start: { line: 0, character: 0 } } },
    ]);
    handle?.release();
  });

  it("returns null once initialize confirms the server has no documentSymbol", async () => {
    const handle = await acquireDocExtension(FILE, "ts");
    const pending = requestDocumentSymbols(FILE, "ts");

    capabilities = { hoverProvider: true };
    resolveInitialize();

    await expect(pending).resolves.toBeNull();
    expect(textDocumentSymbol).not.toHaveBeenCalled();
    handle?.release();
  });
});
