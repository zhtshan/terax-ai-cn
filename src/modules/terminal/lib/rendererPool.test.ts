/// <reference types="vitest/globals" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Shared state for the @xterm/addon-webgl mock. Existing tests leave these
// untouched: element stays null so attachWebgl early-returns, preserving the
// historical no-op behavior.
const webglMock = vi.hoisted(() => ({
  // idle: plain constructor; ok: succeed; fail-leaked-canvas: mimic the real
  // WebglRenderer ctor ordering (WebglRenderer.ts) where the canvas is
  // appended to screenElement before shader setup throws.
  mode: "idle" as "idle" | "ok" | "fail-leaked-canvas",
  constructCount: 0,
  canvases: [] as { remove: ReturnType<typeof vi.fn> }[],
  element: null as null | {
    canvases: { remove: ReturnType<typeof vi.fn> }[];
    querySelectorAll: (sel: string) => unknown[];
  },
}));

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

type MockTextarea = {
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  dispatch: (type: string, ev: Record<string, unknown>) => void;
};

function makeMockTextarea(): MockTextarea {
  const listeners = new Map<string, ((ev: unknown) => void)[]>();
  const ta: MockTextarea = {
    addEventListener: vi.fn(
      (type: string, fn: (ev: unknown) => void, _capture?: boolean) => {
        const list = listeners.get(type) ?? [];
        list.push(fn);
        listeners.set(type, list);
      },
    ),
    removeEventListener: vi.fn(),
    dispatch: (type, ev) => {
      for (const fn of listeners.get(type) ?? []) fn(ev);
    },
  };
  return ta;
}

let lastTextarea: MockTextarea | null = null;
let lastOptions: Record<string, unknown> | null = null;

function MockTerminal(options: Record<string, unknown>) {
  lastOptions = options;
  lastTextarea = makeMockTextarea();
  return {
    ...mockTermMethods,
    textarea: lastTextarea,
    element: webglMock.element ?? undefined,
  };
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
  WebglAddon: function WebglAddon(this: Record<string, unknown>) {
    webglMock.constructCount += 1;
    this.dispose = vi.fn();
    this.onContextLoss = vi.fn();
    if (webglMock.mode === "fail-leaked-canvas") {
      const canvas = {
        getContext: vi.fn(() => null),
        remove: vi.fn(),
        width: 10,
        height: 10,
      };
      webglMock.canvases.push(canvas);
      throw new Error("simulated webgl init failure after canvas append");
    }
  },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
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

describe("custom key event handler IME guard", () => {
  function keyEvent(overrides: Partial<KeyboardEvent>): KeyboardEvent {
    return {
      type: "keydown",
      isComposing: false,
      keyCode: 0,
      key: "",
      code: "",
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      preventDefault: vi.fn(),
      ...overrides,
    } as unknown as KeyboardEvent;
  }

  async function lastHandler(): Promise<(e: KeyboardEvent) => boolean> {
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
    acquireSlot(acquireParams(9));
    const attach = mockTermMethods.attachCustomKeyEventHandler;
    const calls = attach.mock.calls as [(e: KeyboardEvent) => boolean][];
    const handler = calls[calls.length - 1][0];
    expect(typeof handler).toBe("function");
    return handler;
  }

  // keyCode 229 without an active composition is WKWebView's IME punctuation
  // path: blocking it skips xterm's CompositionHelper textarea fallback and
  // swallows the keystroke until a second press.
  it("lets keyCode 229 fall through to xterm's composition fallback", async () => {
    const handler = await lastHandler();
    expect(
      handler(keyEvent({ keyCode: 229, key: "(", code: "Digit9" })),
    ).toBe(true);
  });

  it("still suppresses keydowns during an active IME composition", async () => {
    const handler = await lastHandler();
    expect(
      handler(keyEvent({ isComposing: true, keyCode: 229, key: "Process" })),
    ).toBe(false);
    expect(
      handler(keyEvent({ isComposing: true, keyCode: 13, key: "Enter" })),
    ).toBe(false);
  });
});

describe("WebKit insertText re-emit (xterm #5374 workaround)", () => {
  async function setup(): Promise<{ ta: MockTextarea; writeToPty: ReturnType<typeof vi.fn> }> {
    const { configureRendererPool, acquireSlot } = await import("./rendererPool");
    const writeToPty = vi.fn();
    configureRendererPool({
      resolveLeaf: vi.fn(() => ({ writeToPty })),
      evictLeaf: vi.fn(),
      isLeafFocused: vi.fn(),
      isLeafBlocks: vi.fn(),
      isLeafBusy: vi.fn(),
      isLeafVisible: vi.fn(),
      storeSnapshot: vi.fn(),
    } as never);
    acquireSlot(acquireParams(21));
    expect(lastTextarea).not.toBeNull();
    return { ta: lastTextarea as MockTextarea, writeToPty };
  }

  function insertTextEvent(data: string): Record<string, unknown> {
    return { isComposing: false, inputType: "insertText", data };
  }

  // Shift held (keydown seen since keyup) + WebKit input-before-keydown:
  // xterm's input handler skips (dedupe) and the 229 fallback diffs an
  // already-populated textarea — the workaround must re-emit the character.
  it("re-emits insertText when a modifier key is held down (Shift+? case)", async () => {
    const { ta, writeToPty } = await setup();
    ta.dispatch("keydown", { keyCode: 16, isComposing: false });
    ta.dispatch("input", insertTextEvent("?"));
    expect(writeToPty).toHaveBeenCalledTimes(1);
    expect(writeToPty).toHaveBeenCalledWith("?");
  });

  // keydown(229) arrives first: xterm's composition fallback (setTimeout
  // diff) is pending and will emit the character, so the workaround must
  // not double-send.
  it("does not re-emit while the 229 composition fallback is pending", async () => {
    const { ta, writeToPty } = await setup();
    ta.dispatch("keydown", { keyCode: 229, isComposing: false });
    ta.dispatch("input", insertTextEvent("("));
    expect(writeToPty).not.toHaveBeenCalled();
  });

  // No keydown since the last keyup: xterm's own input handler emits the
  // character, so the workaround must stay out of the way.
  it("does not re-emit when xterm's input handler will emit", async () => {
    const { ta, writeToPty } = await setup();
    ta.dispatch("keyup", { keyCode: 16, isComposing: false });
    ta.dispatch("input", insertTextEvent("a"));
    expect(writeToPty).not.toHaveBeenCalled();
  });

  it("ignores composition input so IME sessions stay untouched", async () => {
    const { ta, writeToPty } = await setup();
    ta.dispatch("keydown", { keyCode: 16, isComposing: false });
    ta.dispatch("input", { isComposing: true, inputType: "insertCompositionText", data: "你" });
    ta.dispatch("input", { isComposing: false, inputType: "insertCompositionText", data: "你" });
    expect(writeToPty).not.toHaveBeenCalled();
  });
});

describe("attachWebgl failure fallback", () => {
  // scheduleUnhide re-arms work via mocked rAF (setTimeout 0); flush so
  // pending frame callbacks settle before counting constructions.
  async function flushFrames(times = 4): Promise<void> {
    for (let i = 0; i < times; i++) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  async function setupPool() {
    const mod = await import("./rendererPool");
    mod.configureRendererPool({
      resolveLeaf: vi.fn(),
      evictLeaf: vi.fn(),
      isLeafFocused: vi.fn(() => false),
      isLeafBlocks: vi.fn(),
      isLeafBusy: vi.fn(),
      isLeafVisible: vi.fn(),
      storeSnapshot: vi.fn(),
    } as never);
    return mod;
  }

  beforeEach(() => {
    webglMock.mode = "idle";
    webglMock.constructCount = 0;
    webglMock.canvases.length = 0;
    webglMock.element = {
      canvases: webglMock.canvases,
      querySelectorAll: (sel: string) =>
        sel === "canvas" ? [...webglMock.canvases] : [],
    };
  });

  afterEach(() => {
    webglMock.mode = "idle";
    webglMock.element = null;
  });

  // A failed attach (shader/link failure after the canvas entered
  // screenElement) must not leave the GL canvas overlaying the DOM renderer:
  // that dead canvas is what blanks the screen and reads as "cannot type".
  it("removes canvases a failed webgl attach leaks into the term element", async () => {
    webglMock.mode = "fail-leaked-canvas";
    const { acquireSlot, refreshLeafSlot } = await setupPool();
    acquireSlot(acquireParams(7));
    refreshLeafSlot(7);
    await flushFrames();
    expect(webglMock.canvases.length).toBeGreaterThan(0);
    for (const canvas of webglMock.canvases) {
      expect(canvas.remove).toHaveBeenCalled();
    }
  });

  // Driver-level GL failures are deterministic; re-attempting on every bind
  // just churns contexts (and, pre-cleanup, leaked canvases).
  it("does not re-attempt webgl attach after a synchronous failure", async () => {
    webglMock.mode = "fail-leaked-canvas";
    const { acquireSlot, refreshLeafSlot } = await setupPool();
    acquireSlot(acquireParams(9));
    refreshLeafSlot(9);
    await flushFrames();
    const settled = webglMock.constructCount;
    expect(settled).toBeGreaterThan(0);
    refreshLeafSlot(9);
    await flushFrames();
    expect(webglMock.constructCount).toBe(settled);
  });

  it("keeps the addon tracked and attached when webgl loads successfully", async () => {
    webglMock.mode = "ok";
    const { acquireSlot, refreshLeafSlot, poolSlotStats } = await setupPool();
    acquireSlot(acquireParams(3));
    refreshLeafSlot(3);
    await flushFrames();
    expect(webglMock.constructCount).toBeGreaterThan(0);
    expect(poolSlotStats()[0]?.webgl).toBe(true);
    const attached = webglMock.constructCount;
    refreshLeafSlot(3);
    await flushFrames();
    expect(webglMock.constructCount).toBe(attached);
  });

  // #1168: CJK glyph overlap in the WebGL renderer. xterm 5.5+ ships an
  // opt-in rescale; enabling it here is the upstream-sanctioned mitigation.
  describe("termOptions", () => {
    beforeEach(() => {
      lastOptions = null;
    });

    it("enables rescaleOverlappingGlyphs", async () => {
      const { acquireSlot, refreshLeafSlot } = await setupPool();
      acquireSlot(acquireParams(21));
      refreshLeafSlot(21);
      await flushFrames();
      expect(lastOptions?.rescaleOverlappingGlyphs).toBe(true);
    });
  });

  // #933: when the boot probe found WebGL2 unusable, attaching would blank
  // the terminal on old WebKit. The flag must gate every attach path.
  it("skips webgl attach when the boot probe flagged the renderer unusable", async () => {
    const { usePreferencesStore } = await import("@/modules/settings/preferences");
    const { toast } = await import("sonner");
    usePreferencesStore.setState({ webglRendererUnusable: true });
    const { acquireSlot, refreshLeafSlot } = await setupPool();
    acquireSlot(acquireParams(31));
    refreshLeafSlot(31);
    await flushFrames();
    expect(webglMock.constructCount).toBe(0);
    expect(toast.error).toHaveBeenCalledTimes(1);
    usePreferencesStore.setState({ webglRendererUnusable: false });
    vi.mocked(toast.error).mockClear();
  });
});
