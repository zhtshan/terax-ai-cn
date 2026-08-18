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
        // Released-but-retained slots have no currentLeafId yet still hold
        // a slot; dispose via retainedLeafId or the loop never drains.
        else if (s.retainedLeafId !== null)
          mod.disposeLeafSlot(s.retainedLeafId);
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
  function makeContainer(): HTMLDivElement {
    return {
      clientWidth: 1024,
      clientHeight: 768,
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ width: 1024, height: 768 })),
    } as unknown as HTMLDivElement;
  }

  function acquireParams(leafId: number) {
    return {
      leafId,
      container: makeContainer(),
      snapshot: null,
      altScreen: false,
      drainRing: vi.fn(),
      shellExited: false,
      searchQuery: null,
      cols: 80,
      rows: 24,
      registerOsc: vi.fn(() => []),
      onSearchReady: vi.fn(),
    };
  }

  it("registers FileLinkProvider even before the explorer root is known", async () => {
    const registerMock = vi.fn(() => ({ dispose: vi.fn() }));
    vi.doMock("./FileLinkProvider", () => ({
      registerFileLinkProvider: registerMock,
    }));

    const { configureRendererPool, acquireSlot, setExplorerRoot } =
      await import("./rendererPool");
    configureRendererPool({
      resolveLeaf: vi.fn(),
      evictLeaf: vi.fn(),
      isLeafFocused: vi.fn(),
      isLeafBlocks: vi.fn(),
      isLeafBusy: vi.fn(),
      isLeafVisible: vi.fn(),
      storeSnapshot: vi.fn(),
    } as never);

    setExplorerRoot(null);
    acquireSlot(acquireParams(1));

    await vi.waitFor(() => {
      expect(registerMock).toHaveBeenCalledTimes(1);
    });
    const callOpts = (registerMock.mock.calls[0] as unknown as [unknown, { getExplorerRoot: () => string | null; getLeafId: () => number | null }])[1];
    expect(callOpts.getExplorerRoot()).toBeNull();
    expect(typeof callOpts.getLeafId).toBe("function");
  });

  it("getLeafId falls back to retainedLeafId after a release", async () => {
    const registerMock = vi.fn(() => ({ dispose: vi.fn() }));
    vi.doMock("./FileLinkProvider", () => ({
      registerFileLinkProvider: registerMock,
    }));

    const { configureRendererPool, acquireSlot, releaseSlot, setExplorerRoot } =
      await import("./rendererPool");
    configureRendererPool({
      resolveLeaf: vi.fn(),
      evictLeaf: vi.fn(),
      isLeafFocused: vi.fn(),
      isLeafBlocks: vi.fn(),
      isLeafBusy: vi.fn(),
      isLeafVisible: vi.fn(),
      storeSnapshot: vi.fn(),
    } as never);

    setExplorerRoot("/workspace/root");
    acquireSlot(acquireParams(5));

    await vi.waitFor(() => {
      expect(registerMock).toHaveBeenCalledTimes(1);
    });
    const callOpts = (registerMock.mock.calls[0] as unknown as [unknown, { getLeafId: () => number | null }])[1];
    expect(callOpts.getLeafId()).toBe(5);

    // Hidden-idle release retains the slot with leaf 5's buffer; the
    // provider must still resolve that leaf's cwd for links on screen.
    releaseSlot(5);
    expect(callOpts.getLeafId()).toBe(5);
  });

  it("passes a live root getter that tracks later setExplorerRoot updates", async () => {
    const registerMock = vi.fn(() => ({ dispose: vi.fn() }));
    vi.doMock("./FileLinkProvider", () => ({
      registerFileLinkProvider: registerMock,
    }));

    const { configureRendererPool, acquireSlot, setExplorerRoot } =
      await import("./rendererPool");
    configureRendererPool({
      resolveLeaf: vi.fn(),
      evictLeaf: vi.fn(),
      isLeafFocused: vi.fn(),
      isLeafBlocks: vi.fn(),
      isLeafBusy: vi.fn(),
      isLeafVisible: vi.fn(),
      storeSnapshot: vi.fn(),
    } as never);

    setExplorerRoot(null);
    acquireSlot(acquireParams(2));

    await vi.waitFor(() => {
      expect(registerMock).toHaveBeenCalledTimes(1);
    });
    const callOpts = (registerMock.mock.calls[0] as unknown as [unknown, { getExplorerRoot: () => string | null }])[1];
    expect(callOpts.getExplorerRoot()).toBeNull();

    setExplorerRoot("/workspace/root");
    expect(callOpts.getExplorerRoot()).toBe("/workspace/root");
  });
});
