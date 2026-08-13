/// <reference types="vitest/globals" />
import { afterEach, describe, expect, it, vi } from "vitest";

// Build a minimal mock Terminal instance that satisfies the rendererPool consumer.
const mockTermMethods = {
  loadAddon: vi.fn(),
  open: vi.fn(),
  onData: vi.fn(),
  registerLinkProvider: vi.fn(() => ({ dispose: vi.fn() })),
  attachCustomKeyEventHandler: vi.fn(),
  options: {} as Record<string, unknown>,
  cols: 80,
  rows: 24,
  buffer: { active: { length: 5000 } },
  hasSelection: vi.fn(() => false),
  getSelection: vi.fn(() => null),
  paste: vi.fn(),
  clear: vi.fn(),
  reset: vi.fn(),
  resize: vi.fn(),
  write: vi.fn(),
  refresh: vi.fn(),
  focus: vi.fn(),
  dispose: vi.fn(),
};

function MockTerminal(_options: Record<string, unknown>) {
  return { ...mockTermMethods };
}

// Mock xterm package.
vi.mock("@xterm/xterm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xterm/xterm")>();
  return {
    ...actual,
    Terminal: MockTerminal,
  };
});

// Mock xterm addons — each must be a constructor function.
vi.mock("@xterm/addon-fit", () => ({
  FitAddon: function FitAddon(this: Record<string, unknown>) {
    this.fit = vi.fn();
  },
}));
vi.mock("@xterm/addon-search", () => ({
  SearchAddon: function SearchAddon(this: Record<string, unknown>) {
    this.findNext = vi.fn();
  },
}));
vi.mock("@xterm/addon-serialize", () => ({
  SerializeAddon: function SerializeAddon(this: Record<string, unknown>) {},
}));
vi.mock("@xterm/addon-web-links", () => ({
  WebLinksAddon: function WebLinksAddon(this: Record<string, unknown>) {},
}));
vi.mock("@xterm/addon-webgl", () => ({
  WebglAddon: function WebglAddon(this: Record<string, unknown>) {},
}));

// Mock styles/tokens to avoid document dependency in theme building.
vi.mock("@/styles/tokens", () => ({
  readTerminalTokens: vi.fn(() => ({
    background: "#1a1b26",
    foreground: "#a9b1d6",
    cursor: "#c0caf5",
    cursorAccent: "#1a1b26",
  })),
}));

// Mock tauri opener.
vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: vi.fn(),
}));

// Mock document and other browser globals for node environment.
const mockEl: Record<string, unknown> = {
  style: {},
  setAttribute: vi.fn(),
  getAttribute: vi.fn(() => null),
  appendChild: vi.fn(),
  removeChild: vi.fn(),
  remove: vi.fn(),
  querySelectorAll: vi.fn(),
  querySelector: vi.fn(),
  insertBefore: vi.fn(),
  clientWidth: 1024,
  clientHeight: 768,
  parentElement: null,
  ownerDocument: null,
};

vi.stubGlobal("document", {
  createElement: vi.fn(() => mockEl),
  createDocumentFragment: vi.fn(() => ({ appendChild: vi.fn() })),
  body: { appendChild: vi.fn(), removeChild: vi.fn() },
  hidden: false,
  hasFocus: vi.fn(() => true),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
} as unknown as Document);

vi.stubGlobal("ResizeObserver", function ResizeObserverMock(this: Record<string, unknown>) {
  this.observe = vi.fn();
  this.disconnect = vi.fn();
});
vi.stubGlobal("IntersectionObserver", function IntersectionObserverMock(this: Record<string, unknown>) {
  this.observe = vi.fn();
  this.disconnect = vi.fn();
});
vi.stubGlobal("requestAnimationFrame", vi.fn((cb: (...args: unknown[]) => void) => setTimeout(cb, 0) as unknown as number));
vi.stubGlobal("cancelAnimationFrame", vi.fn());
vi.stubGlobal("performance", { now: () => Date.now() });
vi.stubGlobal("getComputedStyle", vi.fn(() => ({ color: "#ffffff" })));

// Clean up slots after each test.
afterEach(async () => {
  try {
    const mod = await import("./rendererPool");
    while (mod.poolSize() > 0) {
      const stats = mod.poolSlotStats();
      for (const s of stats) {
        if (s.leafId !== null) mod.disposeLeafSlot(s.leafId);
      }
    }
  } catch {}
});

describe("setExplorerRoot", () => {
  it("is exported as a function", async () => {
    const { setExplorerRoot } = await import("./rendererPool");
    expect(typeof setExplorerRoot).toBe("function");
  });

  it("accepts a non-null string root without throwing", async () => {
    const { setExplorerRoot } = await import("./rendererPool");
    expect(() => setExplorerRoot("/workspace/root")).not.toThrow();
  });

  it("accepts null to clear the root without throwing", async () => {
    const { setExplorerRoot } = await import("./rendererPool");
    expect(() => setExplorerRoot(null)).not.toThrow();
  });
});

describe("createSlot file link registration", () => {
  it("registers FileLinkProvider when explorerRoot is set and webglAddon is null", async () => {
    const registerMock = vi.fn(() => ({ dispose: vi.fn() }));
    vi.doMock("./FileLinkProvider", () => ({
      registerFileLinkProvider: registerMock,
    }));

    const { configureRendererPool, acquireSlot } = await import("./rendererPool");
    configureRendererPool({
      resolveLeaf: vi.fn(),
      evictLeaf: vi.fn(),
      isLeafFocused: vi.fn(),
      isLeafBlocks: vi.fn(),
      isLeafBusy: vi.fn(),
      isLeafVisible: vi.fn(),
      storeSnapshot: vi.fn(),
    } as never);

    const { setExplorerRoot } = await import("./rendererPool");
    setExplorerRoot("/workspace/root");

    // Provide a minimal container.
    const container = {
      clientWidth: 1024,
      clientHeight: 768,
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ width: 1024, height: 768 })),
    } as unknown as HTMLDivElement;

    acquireSlot({
      leafId: 1,
      container,
      snapshot: null,
      altScreen: false,
      drainRing: vi.fn(),
      shellExited: false,
      searchQuery: null,
      cols: 80,
      rows: 24,
      registerOsc: vi.fn(() => []),
      onSearchReady: vi.fn(),
    });

    // Registration is deferred via queueMicrotask.
    await vi.waitFor(() => {
      expect(registerMock).toHaveBeenCalledTimes(1);
    });
    const callOpts = (registerMock.mock.calls[0] as unknown as [unknown, { explorerRoot: string; getLeafId: () => number | null }])[1] as { explorerRoot: string; getLeafId: () => number | null };
    expect(callOpts.explorerRoot).toBe("/workspace/root");
    expect(typeof callOpts.getLeafId).toBe("function");
  });

  it("does NOT register FileLinkProvider when explorerRoot is null", async () => {
    const registerMock = vi.fn(() => ({ dispose: vi.fn() }));
    vi.doMock("./FileLinkProvider", () => ({
      registerFileLinkProvider: registerMock,
    }));

    const { configureRendererPool, acquireSlot } = await import("./rendererPool");
    configureRendererPool({
      resolveLeaf: vi.fn(),
      evictLeaf: vi.fn(),
      isLeafFocused: vi.fn(),
      isLeafBlocks: vi.fn(),
      isLeafBusy: vi.fn(),
      isLeafVisible: vi.fn(),
      storeSnapshot: vi.fn(),
    } as never);

    const { setExplorerRoot } = await import("./rendererPool");
    setExplorerRoot(null);

    const container = {
      clientWidth: 1024,
      clientHeight: 768,
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ width: 1024, height: 768 })),
    } as unknown as HTMLDivElement;

    acquireSlot({
      leafId: 2,
      container,
      snapshot: null,
      altScreen: false,
      drainRing: vi.fn(),
      shellExited: false,
      searchQuery: null,
      cols: 80,
      rows: 24,
      registerOsc: vi.fn(() => []),
      onSearchReady: vi.fn(),
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(registerMock).not.toHaveBeenCalled();
  });
});
