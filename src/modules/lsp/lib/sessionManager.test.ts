import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
const detectBinary = vi.fn();
const transportStart = vi.fn();

let capabilities: Record<string, unknown> | undefined;
let resolveInitialize: () => void;
let initializePromise: Promise<void>;
const textDocumentSymbol = vi.fn();
const rawRequestMock = vi.fn();
const setProgressMock = vi.fn();
const storeProgress: Record<string, unknown> = {};
const transportInstances: Array<{ onProgress?: unknown }> = [];

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
      progress: storeProgress,
      setProgress: (key: string, value: unknown) => {
        storeProgress[key] = value;
        setProgressMock(key, value);
      },
    }),
  },
}));
vi.mock("./transport", () => ({
  TauriLspTransport: class {
    exitInfo: null = null;
    onProgress: ((e: unknown) => void) | null = null;
    start = transportStart;
    close = vi.fn();
    constructor() {
      transportInstances.push(this);
    }
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
    rawRequest = rawRequestMock;
    textDocumentDidClose = vi.fn();
    textDocumentDidSave = vi.fn();
    close = vi.fn();
    shutdownGracefully = vi.fn().mockResolvedValue(undefined);
  },
  lspInteractions: () => [],
  languageServerWithTransport: () => [],
  SynchronizationMethod: { Incremental: 1 },
}));

import {
  acquireDocExtension,
  lspRawRequest,
  requestDocumentSymbols,
  stopPresetSessions,
} from "./sessionManager";

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

describe("lspRawRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capabilities = { documentSymbolProvider: true };
    initializePromise = Promise.resolve();
    detectBinary.mockResolvedValue(true);
    invoke.mockImplementation((cmd: string) =>
      cmd === "lsp_resolve_root"
        ? Promise.resolve("/repo")
        : Promise.resolve(1),
    );
    transportStart.mockResolvedValue(undefined);
  });

  it("returns null when no session is open for the path", async () => {
    expect(
      await lspRawRequest(FILE, "ts", "textDocument/inlayHint", {}),
    ).toBeNull();
    expect(rawRequestMock).not.toHaveBeenCalled();
  });

  it("routes method and params to the client rawRequest", async () => {
    rawRequestMock.mockResolvedValue([{ range: {} }]);
    const handle = await acquireDocExtension(FILE, "ts");
    const result = await lspRawRequest(FILE, "ts", "textDocument/inlayHint", {
      range: { start: { line: 0, character: 0 } },
    });
    expect(result).toEqual([{ range: {} }]);
    expect(rawRequestMock).toHaveBeenCalledWith("textDocument/inlayHint", {
      range: { start: { line: 0, character: 0 } },
    });
    handle?.release();
  });

  it("returns null when the session exits while the request is pending", async () => {
    await acquireDocExtension(FILE, "ts");
    let resolveRaw!: (v: unknown) => void;
    rawRequestMock.mockReturnValue(
      new Promise((r) => {
        resolveRaw = r;
      }),
    );
    const pending = lspRawRequest(FILE, "ts", "textDocument/inlayHint", {});
    // release() only arms the idle timer, so exit the session via
    // closeSession (through stopPresetSessions), which flips `closing` and
    // drops the map entry while the request is still in flight.
    void stopPresetSessions("typescript");
    resolveRaw([{ range: {} }]);
    expect(await pending).toBeNull();
    expect(rawRequestMock).not.toHaveBeenCalled();
  });
});

describe("progress wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transportInstances.length = 0;
    capabilities = { documentSymbolProvider: true };
    initializePromise = Promise.resolve();
    detectBinary.mockResolvedValue(true);
    invoke.mockImplementation((cmd: string) =>
      cmd === "lsp_resolve_root"
        ? Promise.resolve("/repo")
        : Promise.resolve(1),
    );
    transportStart.mockResolvedValue(undefined);
    for (const k of Object.keys(storeProgress)) delete storeProgress[k];
  });

  it("routes $/progress events into the runtime store", async () => {
    const handle = await acquireDocExtension(FILE, "ts");
    const transport = transportInstances[transportInstances.length - 1];
    expect(transport).toBeDefined();
    expect(typeof transport?.onProgress).toBe("function");
    const notify = transport!.onProgress as (e: unknown) => void;
    notify({ token: "t1", kind: "begin", title: "Indexing", percentage: 5 });
    expect(setProgressMock).toHaveBeenCalledWith("typescript\u0000/repo", {
      token: "t1",
      title: "Indexing",
      percentage: 5,
    });
    handle?.release();
  });

  it("keeps the begin title when a later report omits it", async () => {
    await stopPresetSessions("typescript");
    const handle = await acquireDocExtension(FILE, "ts");
    const transport = transportInstances[transportInstances.length - 1];
    expect(transport).toBeDefined();
    const notify = transport!.onProgress as (e: unknown) => void;
    notify({ token: "t1", kind: "begin", title: "Indexing", percentage: 0 });
    notify({ token: "t1", kind: "report", percentage: 50 });
    expect(storeProgress["typescript\u0000/repo"]).toEqual({
      token: "t1",
      title: "Indexing",
      percentage: 50,
    });
    handle?.release();
  });
});
